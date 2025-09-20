import type { ModuleDoc } from "../types";

export const Config_Provider: ModuleDoc = {
  functions: [
    {
      name: "validate_config_path!/1",
      type: "function",
      specs: ["@spec validate_config_path!(config_path()) :: :ok"],
      documentation: "Validates a `t:config_path/0`.\n",
    },
    {
      name: "resolve_config_path!/1",
      type: "function",
      specs: ["@spec resolve_config_path!(config_path()) :: binary()"],
      documentation: "Resolves a `t:config_path/0` to an actual path.\n",
    },
  ],
  name: "Config.Provider",
  callbacks: [
    {
      name: "load/2",
      type: "callback",
      specs: [],
      documentation:
        "Loads configuration (typically during system boot).\n\nIt receives the current `config` and the `state` returned by\n`c:init/1`. Then, you typically read the extra configuration\nfrom an external source and merge it into the received `config`.\nMerging should be done with `Config.Reader.merge/2`, as it\nperforms deep merge. It should return the updated config.\n\nNote that `c:load/2` is typically invoked very early in the\nboot process, therefore if you need to use an application\nin the provider, it is your responsibility to start it.\n",
    },
    {
      name: "init/1",
      type: "callback",
      specs: [],
      documentation:
        "Invoked when initializing a config provider.\n\nA config provider is typically initialized on the machine\nwhere the system is assembled and not on the target machine.\nThe `c:init/1` callback is useful to verify the arguments\ngiven to the provider and prepare the state that will be\ngiven to `c:load/2`.\n\nFurthermore, because the state returned by `c:init/1` can\nbe written to text-based config files, it should be\nrestricted only to simple data types, such as integers,\nstrings, atoms, tuples, maps, and lists. Entries such as\nPIDs, references, and functions cannot be serialized.\n",
    },
  ],
  macros: [],
  types: [
    {
      name: "config_path/0",
      type: "type",
      specs: [
        "@type config_path() :: {:system, binary(), binary()} | binary()",
      ],
      documentation:
        "A path pointing to a configuration file.\n\nSince configuration files are often accessed on target machines,\nit can be expressed either as:\n\n  * a binary representing an absolute path\n\n  * a `{:system, system_var, path}` tuple where the config is the\n    concatenation of the environment variable `system_var` with\n    the given `path`\n\n",
    },
    {
      name: "state/0",
      type: "type",
      specs: ["@type state() :: term()"],
      documentation: null,
    },
    {
      name: "config/0",
      type: "type",
      specs: ["@type config() :: keyword()"],
      documentation: null,
    },
  ],
};
