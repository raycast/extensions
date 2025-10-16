import type { ModuleDoc } from "../types";

export const Application: ModuleDoc = {
  functions: [
    {
      name: "unload/1",
      type: "function",
      specs: ["@spec unload(app()) :: :ok | {:error, term()}"],
      documentation:
        "Unloads the given `app`.\n\nIt will also unload all `:included_applications`.\nNote that the function does not purge the application modules.\n",
    },
    {
      name: "stop/1",
      type: "function",
      specs: ["@spec stop(app()) :: :ok | {:error, term()}"],
      documentation:
        "Stops the given `app`.\n\nWhen stopped, the application is still loaded.\n",
    },
    {
      name: "started_applications/1",
      type: "function",
      specs: [
        "@spec started_applications(timeout()) :: [\n        {app(), description :: charlist(), vsn :: charlist()}\n      ]",
      ],
      documentation:
        "Returns a list with information about the applications which are currently running.\n",
    },
    {
      name: "start/2",
      type: "function",
      specs: ["@spec start(app(), restart_type()) :: :ok | {:error, term()}"],
      documentation:
        "Starts the given `app` with `t:restart_type/0`.\n\nIf the `app` is not loaded, the application will first be loaded using `load/1`.\nAny included application, defined in the `:included_applications` key of the\n`.app` file will also be loaded, but they won't be started.\n\nFurthermore, all applications listed in the `:applications` key must be explicitly\nstarted before this application is. If not, `{:error, {:not_started, app}}` is\nreturned, where `app` is the name of the missing application.\n\nIn case you want to automatically load **and start** all of `app`'s dependencies,\nsee `ensure_all_started/2`.\n",
    },
    {
      name: "spec/2",
      type: "function",
      specs: ["@spec spec(app(), application_key()) :: value() | nil"],
      documentation:
        "Returns the value for `key` in `app`'s specification.\n\nSee `spec/1` for the supported keys. If the given\nspecification parameter does not exist, this function\nwill raise. Returns `nil` if the application is not loaded.\n",
    },
    {
      name: "spec/1",
      type: "function",
      specs: ["@spec spec(app()) :: [{application_key(), value()}] | nil"],
      documentation:
        "Returns the spec for `app`.\n\nThe following keys are returned:\n\n  * `:description`\n  * `:id`\n  * `:vsn`\n  * `:modules`\n  * `:maxP`\n  * `:maxT`\n  * `:registered`\n  * `:included_applications`\n  * `:optional_applications`\n  * `:applications`\n  * `:mod`\n  * `:start_phases`\n\nFor a description of all fields, see [Erlang's application\nspecification](https://www.erlang.org/doc/man/app).\n\nNote the environment is not returned as it can be accessed via\n`fetch_env/2`. Returns `nil` if the application is not loaded.\n",
    },
    {
      name: "put_env/4",
      type: "function",
      specs: [
        "@spec put_env(app(), key(), value(), timeout: timeout(), persistent: boolean()) ::\n        :ok",
      ],
      documentation:
        "Puts the `value` in `key` for the given `app`.\n\n## Options\n\n  * `:timeout` - the timeout for the change (defaults to `5_000` milliseconds)\n  * `:persistent` - persists the given value on application load and reloads\n\nIf `put_env/4` is called before the application is loaded, the application\nenvironment values specified in the `.app` file will override the ones\npreviously set.\n\nThe `:persistent` option can be set to `true` when there is a need to guarantee\nparameters set with this function will not be overridden by the ones defined\nin the application resource file on load. This means persistent values will\nstick after the application is loaded and also on application reload.\n",
    },
    {
      name: "put_all_env/2",
      type: "function",
      specs: [
        "@spec put_all_env([{app(), [{key(), value()}]}],\n        timeout: timeout(),\n        persistent: boolean()\n      ) :: :ok",
      ],
      documentation:
        "Puts the environment for multiple applications at the same time.\n\nThe given config should not:\n\n  * have the same application listed more than once\n  * have the same key inside the same application listed more than once\n\nIf those conditions are not met, this function will raise.\n\nThis function receives the same options as `put_env/4`. Returns `:ok`.\n\n## Examples\n\n    Application.put_all_env(\n      my_app: [\n        key: :value,\n        another_key: :another_value\n      ],\n      another_app: [\n        key: :value\n      ]\n    )\n\n",
    },
    {
      name: "loaded_applications/0",
      type: "function",
      specs: [
        "@spec loaded_applications() :: [\n        {app(), description :: charlist(), vsn :: charlist()}\n      ]",
      ],
      documentation:
        "Returns a list with information about the applications which have been loaded.\n",
    },
    {
      name: "load/1",
      type: "function",
      specs: ["@spec load(app()) :: :ok | {:error, term()}"],
      documentation:
        "Loads the given `app`.\n\nIn order to be loaded, an `.app` file must be in the load paths.\nAll `:included_applications` will also be loaded.\n\nLoading the application does not start it nor load its modules, but\nit does load its environment.\n",
    },
    {
      name: "get_env/3",
      type: "function",
      specs: ["@spec get_env(app(), key(), value()) :: value()"],
      documentation:
        'Returns the value for `key` in `app`\'s environment.\n\nIf the configuration parameter does not exist, the function returns the\n`default` value.\n\n> #### Warning {: .warning}\n>\n> You must use this function to read only your own application\n> environment. Do not read the environment of other applications.\n\n> #### Application environment in libraries {: .info}\n>\n> If you are writing a library to be used by other developers,\n> it is generally recommended to avoid the application environment, as the\n> application environment is effectively a global storage. For more information,\n> read our [library guidelines](library-guidelines.md).\n\n## Examples\n\n`get_env/3` is commonly used to read the configuration of your OTP applications.\nSince Mix configurations are commonly used to configure applications, we will use\nthis as a point of illustration.\n\nConsider a new application `:my_app`. `:my_app` contains a database engine which\nsupports a pool of databases. The database engine needs to know the configuration for\neach of those databases, and that configuration is supplied by key-value pairs in\nenvironment of `:my_app`.\n\n    config :my_app, Databases.RepoOne,\n      # A database configuration\n      ip: "localhost",\n      port: 5433\n\n    config :my_app, Databases.RepoTwo,\n      # Another database configuration (for the same OTP app)\n      ip: "localhost",\n      port: 20717\n\n    config :my_app, my_app_databases: [Databases.RepoOne, Databases.RepoTwo]\n\nOur database engine used by `:my_app` needs to know what databases exist, and\nwhat the database configurations are. The database engine can make a call to\n`Application.get_env(:my_app, :my_app_databases, [])` to retrieve the list of\ndatabases (specified by module names).\n\nThe engine can then traverse each repository in the list and call\n`Application.get_env(:my_app, Databases.RepoOne)` and so forth to retrieve the\nconfiguration of each one. In this case, each configuration will be a keyword\nlist, so you can use the functions in the `Keyword` module or even the `Access`\nmodule to traverse it, for example:\n\n    config = Application.get_env(:my_app, Databases.RepoOne)\n    config[:ip]\n\n',
    },
    {
      name: "get_application/1",
      type: "function",
      specs: ["@spec get_application(atom()) :: atom() | nil"],
      documentation:
        "Gets the application for the given module.\n\nThe application is located by analyzing the spec\nof all loaded applications. Returns `nil` if\nthe module is not listed in any application spec.\n",
    },
    {
      name: "get_all_env/1",
      type: "function",
      specs: ["@spec get_all_env(app()) :: [{key(), value()}]"],
      documentation: "Returns all key-value pairs for `app`.\n",
    },
    {
      name: "format_error/1",
      type: "function",
      specs: ["@spec format_error(any()) :: String.t()"],
      documentation:
        "Formats the error reason returned by `start/2`,\n`ensure_started/2`, `stop/1`, `load/1` and `unload/1`,\nreturns a string.\n",
    },
    {
      name: "fetch_env!/2",
      type: "function",
      specs: ["@spec fetch_env!(app(), key()) :: value()"],
      documentation:
        "Returns the value for `key` in `app`'s environment.\n\nIf the configuration parameter does not exist, raises `ArgumentError`.\n\n> #### Warning {: .warning}\n>\n> You must use this function to read only your own application\n> environment. Do not read the environment of other applications.\n\n> #### Application environment in info\n>\n> If you are writing a library to be used by other developers,\n> it is generally recommended to avoid the application environment, as the\n> application environment is effectively a global storage. For more information,\n> read our [library guidelines](library-guidelines.md).\n",
    },
    {
      name: "fetch_env/2",
      type: "function",
      specs: ["@spec fetch_env(app(), key()) :: {:ok, value()} | :error"],
      documentation:
        "Returns the value for `key` in `app`'s environment in a tuple.\n\nIf the configuration parameter does not exist, the function returns `:error`.\n\n> #### Warning {: .warning}\n>\n> You must use this function to read only your own application\n> environment. Do not read the environment of other applications.\n\n> #### Application environment in info\n>\n> If you are writing a library to be used by other developers,\n> it is generally recommended to avoid the application environment, as the\n> application environment is effectively a global storage. For more information,\n> read our [library guidelines](library-guidelines.md).\n",
    },
    {
      name: "ensure_started/2",
      type: "function",
      specs: [
        "@spec ensure_started(app(), restart_type()) :: :ok | {:error, term()}",
      ],
      documentation:
        "Ensures the given `app` is started with `t:restart_type/0`.\n\nSame as `start/2` but returns `:ok` if the application was already\nstarted.\n",
    },
    {
      name: "ensure_loaded/1",
      type: "function",
      specs: ["@spec ensure_loaded(app()) :: :ok | {:error, term()}"],
      documentation:
        "Ensures the given `app` is loaded.\n\nSame as `load/1` but returns `:ok` if the application was already\nloaded.\n",
    },
    {
      name: "ensure_all_started/2",
      type: "function",
      specs: [
        "@spec ensure_all_started(app() | [app()],\n        type: restart_type(),\n        mode: :serial | :concurrent\n      ) :: {:ok, [app()]} | {:error, term()}",
        "@spec ensure_all_started(app() | [app()], restart_type()) ::\n        {:ok, [app()]} | {:error, term()}",
      ],
      documentation:
        "Ensures the given `app` or `apps` and their child applications are started.\n\nThe second argument is either the `t:restart_type/1` (for consistency with\n`start/2`) or a keyword list.\n\n## Options\n\n  * `:type` - if the application should be started `:temporary` (default),\n    `:permanent`, or `:transient`. See `t:restart_type/1` for more information.\n\n  * `:mode` - (since v1.15.0) if the applications should be started serially\n    (`:serial`, default) or concurrently (`:concurrent`). This option requires\n    Erlang/OTP 26+.\n\n",
    },
    {
      name: "delete_env/3",
      type: "function",
      specs: [
        "@spec delete_env(app(), key(), timeout: timeout(), persistent: boolean()) :: :ok",
      ],
      documentation:
        "Deletes the `key` from the given `app` environment.\n\nIt receives the same options as `put_env/4`. Returns `:ok`.\n",
    },
    {
      name: "compile_env!/3",
      type: "function",
      specs: [
        "@spec compile_env!(Macro.Env.t(), app(), key() | list()) :: value()",
      ],
      documentation:
        "Reads the application environment at compilation time from a macro\nor raises.\n\nTypically, developers will use `compile_env!/2`. This function must\nonly be invoked from macros which aim to read the compilation environment\ndynamically.\n\nIt expects a `Macro.Env` as first argument, where the `Macro.Env` is\ntypically the `__CALLER__` in a macro. It raises if `Macro.Env` comes\nfrom a function.\n",
    },
    {
      name: "compile_env/4",
      type: "function",
      specs: [
        "@spec compile_env(Macro.Env.t(), app(), key() | list(), value()) :: value()",
      ],
      documentation:
        "Reads the application environment at compilation time from a macro.\n\nTypically, developers will use `compile_env/3`. This function must\nonly be invoked from macros which aim to read the compilation environment\ndynamically.\n\nIt expects a `Macro.Env` as first argument, where the `Macro.Env` is\ntypically the `__CALLER__` in a macro. It raises if `Macro.Env` comes\nfrom a function.\n",
    },
    {
      name: "app_dir/2",
      type: "function",
      specs: ["@spec app_dir(app(), String.t() | [String.t()]) :: String.t()"],
      documentation:
        'Returns the given path inside `app_dir/1`.\n\nIf `path` is a string, then it will be used as the path inside `app_dir/1`. If\n`path` is a list of strings, it will be joined (see `Path.join/1`) and the result\nwill be used as the path inside `app_dir/1`.\n\n## Examples\n\n    File.mkdir_p!("foo/ebin")\n    Code.prepend_path("foo/ebin")\n\n    Application.app_dir(:foo, "my_path")\n    #=> "foo/my_path"\n\n    Application.app_dir(:foo, ["my", "nested", "path"])\n    #=> "foo/my/nested/path"\n\n',
    },
    {
      name: "app_dir/1",
      type: "function",
      specs: ["@spec app_dir(app()) :: String.t()"],
      documentation:
        'Gets the directory for app.\n\nThis information is returned based on the code path. Here is an\nexample:\n\n    File.mkdir_p!("foo/ebin")\n    Code.prepend_path("foo/ebin")\n    Application.app_dir(:foo)\n    #=> "foo"\n\nEven though the directory is empty and there is no `.app` file\nit is considered the application directory based on the name\n"foo/ebin". The name may contain a dash `-` which is considered\nto be the app version and it is removed for the lookup purposes:\n\n    File.mkdir_p!("bar-123/ebin")\n    Code.prepend_path("bar-123/ebin")\n    Application.app_dir(:bar)\n    #=> "bar-123"\n\nFor more information on code paths, check the `Code` module in\nElixir and also Erlang\'s [`:code` module](`:code`).\n',
    },
  ],
  name: "Application",
  callbacks: [
    {
      name: "stop/1",
      type: "callback",
      specs: ["@callback stop(app()) :: :ok | {:error, term()}"],
      documentation:
        "Called after an application has been stopped.\n\nThis function is called after an application has been stopped, i.e., after its\nsupervision tree has been stopped. It should do the opposite of what the\n`c:start/2` callback did, and should perform any necessary cleanup. The return\nvalue of this callback is ignored.\n\n`state` is the state returned by `c:start/2`, if it did, or `[]` otherwise.\nIf the optional callback `c:prep_stop/1` is present, `state` is its return\nvalue instead.\n\n`use Application` defines a default implementation of this function which does\nnothing and just returns `:ok`.\n",
    },
    {
      name: "start_phase/3",
      type: "callback",
      specs: [],
      documentation:
        "Starts an application in synchronous phases.\n\nThis function is called after `start/2` finishes but before\n`Application.start/2` returns. It will be called once for every start phase\ndefined in the application's (and any included applications') specification,\nin the order they are listed in.\n",
    },
    {
      name: "start/2",
      type: "callback",
      specs: [
        "@callback start(app(), restart_type()) :: :ok | {:error, term()}",
      ],
      documentation:
        "Called when an application is started.\n\nThis function is called when an application is started using\n`Application.start/2` (and functions on top of that, such as\n`Application.ensure_started/2`). This function should start the top-level\nprocess of the application (which should be the top supervisor of the\napplication's supervision tree if the application follows the OTP design\nprinciples around supervision).\n\n`start_type` defines how the application is started:\n\n  * `:normal` - used if the startup is a normal startup or if the application\n    is distributed and is started on the current node because of a failover\n    from another node and the application specification key `:start_phases`\n    is `:undefined`.\n  * `{:takeover, node}` - used if the application is distributed and is\n    started on the current node because of a failover on the node `node`.\n  * `{:failover, node}` - used if the application is distributed and is\n    started on the current node because of a failover on node `node`, and the\n    application specification key `:start_phases` is not `:undefined`.\n\n`start_args` are the arguments passed to the application in the `:mod`\nspecification key (for example, `mod: {MyApp, [:my_args]}`).\n\nThis function should either return `{:ok, pid}` or `{:ok, pid, state}` if\nstartup is successful. `pid` should be the PID of the top supervisor. `state`\ncan be an arbitrary term, and if omitted will default to `[]`; if the\napplication is later stopped, `state` is passed to the `stop/1` callback (see\nthe documentation for the `c:stop/1` callback for more information).\n\n`use Application` provides no default implementation for the `start/2`\ncallback.\n",
    },
    {
      name: "prep_stop/1",
      type: "callback",
      specs: [],
      documentation:
        "Called before stopping the application.\n\nThis function is called before the top-level supervisor is terminated. It\nreceives the state returned by `c:start/2`, if it did, or `[]` otherwise.\nThe return value is later passed to `c:stop/1`.\n",
    },
    {
      name: "config_change/3",
      type: "callback",
      specs: [],
      documentation:
        "Callback invoked after code upgrade, if the application environment\nhas changed.\n\n`changed` is a keyword list of keys and their changed values in the\napplication environment. `new` is a keyword list with all new keys\nand their values. `removed` is a list with all removed keys.\n",
    },
  ],
  macros: [
    {
      name: "compile_env!/2",
      type: "macro",
      specs: [],
      documentation:
        "Reads the application environment at compilation time or raises.\n\nThis is the same as `compile_env/3` but it raises an\n`ArgumentError` if the configuration is not available.\n",
    },
    {
      name: "compile_env/3",
      type: "macro",
      specs: [],
      documentation:
        "Reads the application environment at compilation time.\n\nSimilar to `get_env/3`, except it must be used to read values\nat compile time. This allows Elixir to track when configuration\nvalues change between compile time and runtime.\n\nThe first argument is the application name. The second argument\n`key_or_path` is either an atom key or a path to traverse in\nsearch of the configuration, starting with an atom key.\n\nFor example, imagine the following configuration:\n\n    config :my_app, :key, [foo: [bar: :baz]]\n\nWe can access it during compile time as:\n\n    Application.compile_env(:my_app, :key)\n    #=> [foo: [bar: :baz]]\n\n    Application.compile_env(:my_app, [:key, :foo])\n    #=> [bar: :baz]\n\n    Application.compile_env(:my_app, [:key, :foo, :bar])\n    #=> :baz\n\nA default value can also be given as third argument. If\nany of the keys in the path along the way is missing, the\ndefault value is used:\n\n    Application.compile_env(:my_app, [:unknown, :foo, :bar], :default)\n    #=> :default\n\n    Application.compile_env(:my_app, [:key, :unknown, :bar], :default)\n    #=> :default\n\n    Application.compile_env(:my_app, [:key, :foo, :unknown], :default)\n    #=> :default\n\nGiving a path is useful to let Elixir know that only certain paths\nin a large configuration are compile time dependent.\n",
    },
  ],
  types: [
    {
      name: "restart_type/0",
      type: "type",
      specs: ["@type restart_type() :: :permanent | :transient | :temporary"],
      documentation:
        "Specifies the type of the application:\n\n  * `:permanent` - if `app` terminates, all other applications and the entire\n    node are also terminated.\n\n  * `:transient` - if `app` terminates with `:normal` reason, it is reported\n    but no other applications are terminated. If a transient application\n    terminates abnormally, all other applications and the entire node are\n    also terminated.\n\n  * `:temporary` - if `app` terminates, it is reported but no other\n    applications are terminated (the default).\n\nNote that it is always possible to stop an application explicitly by calling\n`stop/1`. Regardless of the type of the application, no other applications will\nbe affected.\n\nNote also that the `:transient` type is of little practical use, since when a\nsupervision tree terminates, the reason is set to `:shutdown`, not `:normal`.\n",
    },
    {
      name: "start_type/0",
      type: "type",
      specs: [
        "@type start_type() :: :normal | {:takeover, node()} | {:failover, node()}",
      ],
      documentation: null,
    },
    {
      name: "state/0",
      type: "type",
      specs: ["@type state() :: term()"],
      documentation: null,
    },
    {
      name: "value/0",
      type: "type",
      specs: ["@type value() :: term()"],
      documentation: null,
    },
    {
      name: "application_key/0",
      type: "type",
      specs: [
        "@type application_key() ::\n        :start_phases\n        | :mod\n        | :applications\n        | :optional_applications\n        | :included_applications\n        | :registered\n        | :maxT\n        | :maxP\n        | :modules\n        | :vsn\n        | :id\n        | :description",
      ],
      documentation: null,
    },
    {
      name: "key/0",
      type: "type",
      specs: ["@type key() :: atom()"],
      documentation: null,
    },
    {
      name: "app/0",
      type: "type",
      specs: ["@type app() :: atom()"],
      documentation: null,
    },
  ],
};
