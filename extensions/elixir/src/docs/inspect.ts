import type { ModuleDoc } from "../types";

export const Inspect: ModuleDoc = {
  functions: [
    {
      name: "inspect/2",
      type: "function",
      specs: ["@spec inspect(t(), Inspect.Opts.t()) :: Inspect.Algebra.t()"],
      documentation:
        "Converts `term` into an algebra document.\n\nThis function shouldn't be invoked directly, unless when implementing\na custom `inspect_fun` to be given to `Inspect.Opts`. Everywhere else,\n`Inspect.Algebra.to_doc/2` should be preferred as it handles structs\nand exceptions.\n",
    },
  ],
  name: "Inspect",
  callbacks: [
    {
      name: "inspect/2",
      type: "callback",
      specs: [
        "@callback inspect(t(), Inspect.Opts.t()) :: Inspect.Algebra.t()",
      ],
      documentation:
        "Converts `term` into an algebra document.\n\nThis function shouldn't be invoked directly, unless when implementing\na custom `inspect_fun` to be given to `Inspect.Opts`. Everywhere else,\n`Inspect.Algebra.to_doc/2` should be preferred as it handles structs\nand exceptions.\n",
    },
  ],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: ["@type t() :: term()"],
      documentation: "All the types that implement this protocol.\n",
    },
  ],
};
