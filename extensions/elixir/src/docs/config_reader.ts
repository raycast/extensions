import type { ModuleDoc } from "../types";

export const Config_Reader: ModuleDoc = {
  functions: [
    {
      name: "read_imports!/2",
      type: "function",
      specs: [
        "@spec read_imports!(\n        Path.t(),\n        keyword()\n      ) :: {keyword(), [Path.t()]}",
      ],
      documentation:
        "Reads the given configuration file and returns the configuration\nwith its imports.\n\nAccepts the same options as `read!/2`. Although note the `:imports`\noption cannot be disabled in `read_imports!/2`.\n",
    },
    {
      name: "read!/2",
      type: "function",
      specs: [
        "@spec read!(\n        Path.t(),\n        keyword()\n      ) :: keyword()",
      ],
      documentation:
        "Reads the configuration file.\n\n## Options\n\n  * `:imports` - a list of already imported paths or `:disabled`\n    to disable imports\n\n  * `:env` - the environment the configuration file runs on.\n    See `Config.config_env/0` for sample usage\n\n  * `:target` - the target the configuration file runs on.\n    See `Config.config_target/0` for sample usage\n\n",
    },
    {
      name: "merge/2",
      type: "function",
      specs: ["@spec merge(keyword(), keyword()) :: keyword()"],
      documentation:
        "Merges two configurations.\n\nThe configurations are merged together with the values in\nthe second one having higher preference than the first in\ncase of conflicts. In case both values are set to keyword\nlists, it deep merges them.\n\n## Examples\n\n    iex> Config.Reader.merge([app: [k: :v1]], [app: [k: :v2]])\n    [app: [k: :v2]]\n\n    iex> Config.Reader.merge([app: [k: [v1: 1, v2: 2]]], [app: [k: [v2: :a, v3: :b]]])\n    [app: [k: [v1: 1, v2: :a, v3: :b]]]\n\n    iex> Config.Reader.merge([app1: []], [app2: []])\n    [app1: [], app2: []]\n\n",
    },
    {
      name: "eval!/3",
      type: "function",
      specs: ["@spec eval!(Path.t(), binary(), keyword()) :: keyword()"],
      documentation:
        "Evaluates the configuration `contents` for the given `file`.\n\nAccepts the same options as `read!/2`.\n",
    },
  ],
  name: "Config.Reader",
  callbacks: [],
  macros: [],
  types: [],
};
