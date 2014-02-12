/**
 * RPC2
 * A Backbone plugin that allows Models and Collections to be retrieved and updated over JSON RPC 2.0
 * instead of REST
 */

/**
 * Helpers
 */
// Fallback to JSON.stringify if $.toJSON is not available
if (typeof $.toJSON === 'undefined') {
	$.toJSON = function(object) {
		return JSON.stringify(object);
	};
}

/**
 * The actual plugin
 */
(function () {

	// Define the RPC2 plugin
	var RPC2 = {};

	// Attach our plugin to Backbone
	Backbone.RPC2 = RPC2;

	/**
	 * A custom sync method to use JSON RPC
	 * @param  {[string]} method – the CRUD method ("create", "read", "update", or "delete")
	 * @param  {[object]} model – the model to be saved (or collection to be read)
	 * @param  {[type]} options – success and error callbacks, and all other jQuery request options
	 */
	RPC2.sync = function(method, model, options) {

		var client = new $.JsonRpcClient({
			ajaxUrl: model.url,
			headers: model.rpcOptions.headers
		});

		var success = function(response) {

			// call the success callback
			options.success(response);

		};

		var error = function(response) {

			// call the error callback
			options.error(response);

		};

		if (method == "create") {
			client.call(model.rpcOptions.methods.create.method, model.constructParams("create"), success, error);

		} else if (method == "read") {
			client.call(model.rpcOptions.methods.read.method, model.constructParams("read"), success, error);

		} else if (method == "update") {
			client.call(model.rpcOptions.methods.update.method, model.constructParams("update"), success, error);

		} else if (method == "delete") {
			client.call(model.rpcOptions.methods.delete.method, model.constructParams("delete"), success, error);
		}

	};

	/**
	 * Backbone.RPC2.Model
	 * An extension of Backbone.Model which uses RPC2.sync instead of the default Backbone.sync
	 */
	RPC2.Model = Backbone.Model.extend({

		/**
		 * Important options for RPC for this model
		 */
		url: 'path/to/my/rpc/handler',
		rpcOptions: {
			headers: {},
			methods: {
				create: {
					method: 'create', // name of the method to call for CREATE
					params: { // param_name: 'model_attribute'
						name: 'attributes.name'
					}
				},
				read: {
					method: 'read',
					params: {
						id: 'attributes.id'
					}
				},
				update: {
					method: 'update',
					params: {
						id: 'attributes.id',
						name: 'attributes.name'
					}
				},
				'delete': {
					method: 'delete',
					params: {
						id: 'attributes.id'
					}
				}
			}
		},
		/**
		 * Inherits undefined options from the super class
		 */
		inheritOptions: function() {
			this.rpcOptions = this.recursivelyInheritOptions(this.rpcOptions, this.constructor.__super__.rpcOptions, 'rpcOptions');
		},
		recursivelyInheritOptions: function(rpcOptions, superRpcOptions, parentKey) {
			// only inherit the following properties if they are undefined
			var dontRecursivelyInherit = [
				'rpcOptions.headers',
				'methods.create', 'methods.read', 'methods.update', 'methods.delete'
			];
			var model = this;
			$.each(superRpcOptions, function(key, value) {
				if (typeof rpcOptions[key] === 'undefined') {
					rpcOptions[key] = value;

				// if this key is an object, we'll recursively pull unset options from it
				// we won't touch anything inside the options defined in the dontRecursivelyInherit array
				} else if (typeof rpcOptions[key] === 'object' && _.indexOf(dontRecursivelyInherit, parentKey+'.'+key) === -1) {
					rpcOptions[key] = model.recursivelyInheritOptions(rpcOptions[key], superRpcOptions[key], key);

				}
			});
			return rpcOptions;
		},

		/**
		 * Create the params object based on the method we're calling
		 */
		constructParams: function(method) {
			// get the params for this method
			var params = this.rpcOptions.methods[method].params;

			// params might be a function
			if (typeof params === 'function') {
				params = params(this);
			}

			if (!params) {
				params = [];
			}

			// params can be deeply nested
			return this.recursivelySetParams(params);
		},
		recursivelySetParams: function(params) {

			var model = this;

			$.each(params, function(param, attribute) {
				// if this attrbite is an object (or an array), we should recurse into it any update its attributes
				if (typeof attribute === 'object') {
					attribute = model.recursivelySetParams(attribute);

				} else if (typeof attribute === 'string') {
					// use a model from the attribute if the string starts with "attributes."
					if (attribute.indexOf('attributes.') === 0) {
						var model_attribute = attribute.replace('attributes.', '');
						if (model.get(model_attribute)) {
							params[param] = model.get(model_attribute);
						}
					}
					// otherwise use the string that was given in configuration
				}

			});

			return params;

		},

		/**
		 * Maps to our custom sync method
		 */
		sync: function(method, model, options) {
			return RPC2.sync(method, model, options);
		}

	});

}());