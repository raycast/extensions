import type { ModuleDoc } from "../types";

export const Config: ModuleDoc = {
  functions: [
    {
      name: "config/3",
      type: "function",
      specs: [],
      documentation:
        "Configures the given `key` for the given `root_key`.\n\nKeyword lists are always deep merged.\n\n## Examples\n\nThe given `opts` are merged into the existing values for `key`\nin the given `root_key`. Conflicting keys are overridden by the\nones specified in `opts`, unless they are keywords, which are\ndeep merged recursively. For example, the application configuration\nbelow\n\n    config :ecto, Repo,\n      log_level: :warn,\n      adapter: Ecto.Adapters.Postgres,\n      metadata: [read_only: true]\n\n    config :ecto, Repo,\n      log_level: :info,\n      pool_size: 10,\n      metadata: [replica: true]\n\nwill have a final value of the configuration for the `Repo`\nkey in the `:ecto` application of:\n\n    Application.get_env(:ecto, Repo)\n    #=> [\n    #=>   log_level: :info,\n    #=>   pool_size: 10,\n    #=>   adapter: Ecto.Adapters.Postgres,\n    #=>   metadata: [read_only: true, replica: true]\n    #=> ]\n\n",
    },
    {
      name: "config/2",
      type: "function",
      specs: [],
      documentation:
        "Configures the given `root_key`.\n\nKeyword lists are always deep-merged.\n\n## Examples\n\nThe given `opts` are merged into the existing configuration\nfor the given `root_key`. Conflicting keys are overridden by the\nones specified in `opts`, unless they are keywords, which are\ndeep merged recursively. For example, the application configuration\nbelow\n\n    config :logger,\n      level: :warn,\n      backends: [:console]\n\n    config :logger,\n      level: :info,\n      truncate: 1024\n\nwill have a final configuration for `:logger` of:\n\n    [level: :info, backends: [:console], truncate: 1024]\n\n",
    },
  ],
  name: "Config",
  callbacks: [],
  macros: [
    {
      name: "import_config/1",
      type: "macro",
      specs: [],
      documentation:
        'Imports configuration from the given file.\n\nIn case the file doesn\'t exist, an error is raised.\n\nIf file is a relative, it will be expanded relatively to the\ndirectory the current configuration file is in.\n\n## Examples\n\nThis is often used to emulate configuration across environments:\n\n    import_config "#{config_env()}.exs"\n\nNote, however, some configuration files, such as `config/runtime.exs`\ndoes not support imports, as they are meant to be copied across\nsystems.\n',
    },
    {
      name: "config_target/0",
      type: "macro",
      specs: [],
      documentation:
        "Returns the target this configuration file is executed on.\n\nThis is most often used to execute conditional code:\n\n    if config_target() == :host do\n      config :my_app, :debug, false\n    end\n\n",
    },
    {
      name: "config_env/0",
      type: "macro",
      specs: [],
      documentation:
        "Returns the environment this configuration file is executed on.\n\nIn Mix projects this function returns the environment this configuration\nfile is executed on. In releases, the environment when `mix release` ran.\n\nThis is most often used to execute conditional code:\n\n    if config_env() == :prod do\n      config :my_app, :debug, false\n    end\n\n",
    },
  ],
  types: [],
};
