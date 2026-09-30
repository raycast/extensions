import type { ModuleDoc } from "../types";

export const IO_Stream: ModuleDoc = {
  functions: [],
  name: "IO.Stream",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %IO.Stream{\n        device: IO.device(),\n        line_or_bytes: :line | non_neg_integer(),\n        raw: boolean()\n      }",
      ],
      documentation: null,
    },
  ],
};
