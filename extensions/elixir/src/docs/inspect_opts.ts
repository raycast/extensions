import type { ModuleDoc } from "../types";

export const Inspect_Opts: ModuleDoc = {
  functions: [
    {
      name: "new/1",
      type: "function",
      specs: ["@spec new(keyword()) :: t()"],
      documentation: "Builds an `Inspect.Opts` struct.\n",
    },
    {
      name: "default_inspect_fun/1",
      type: "function",
      specs: [
        "@spec default_inspect_fun((term(), t() -> Inspect.Algebra.t())) :: :ok",
      ],
      documentation:
        'Sets the default inspect function.\n\nSet this option with care as it will change how all values\nin the system are inspected. The main use of this functionality\nis to provide an entry point to filter inspected values,\nin order for entities to comply with rules and legislations\non data security and data privacy.\n\nIt is **extremely discouraged** for libraries to set their own\nfunction as this must be controlled by applications. Libraries\nshould instead define their own structs with custom inspect\nimplementations. If a library must change the default inspect\nfunction, then it is best to ask users of your library to explicitly\ncall `default_inspect_fun/1` with your function of choice.\n\nThe default is `Inspect.inspect/2`.\n\n## Examples\n\n    previous_fun = Inspect.Opts.default_inspect_fun()\n\n    Inspect.Opts.default_inspect_fun(fn\n      %{address: _} = map, opts ->\n        previous_fun.(%{map | address: "[REDACTED]"}, opts)\n\n      value, opts ->\n        previous_fun.(value, opts)\n    end)\n\n',
    },
    {
      name: "default_inspect_fun/0",
      type: "function",
      specs: [
        "@spec default_inspect_fun() :: (term(), t() -> Inspect.Algebra.t())",
      ],
      documentation: "Returns the default inspect function.\n",
    },
  ],
  name: "Inspect.Opts",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %Inspect.Opts{\n        base: :decimal | :binary | :hex | :octal,\n        binaries: :infer | :as_binaries | :as_strings,\n        char_lists: term(),\n        charlists: :infer | :as_lists | :as_charlists,\n        custom_options: keyword(),\n        inspect_fun: (any(), t() -> Inspect.Algebra.t()),\n        limit: non_neg_integer() | :infinity,\n        pretty: boolean(),\n        printable_limit: non_neg_integer() | :infinity,\n        safe: boolean(),\n        structs: boolean(),\n        syntax_colors: [{color_key(), IO.ANSI.ansidata()}],\n        width: non_neg_integer() | :infinity\n      }",
      ],
      documentation: null,
    },
    {
      name: "color_key/0",
      type: "type",
      specs: ["@type color_key() :: atom()"],
      documentation: null,
    },
  ],
};
