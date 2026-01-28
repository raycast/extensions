import type { ModuleDoc } from "../types";

export const String_Chars: ModuleDoc = {
  functions: [
    {
      name: "to_string/1",
      type: "function",
      specs: ["@spec to_string(t()) :: String.t()"],
      documentation: "Converts `term` to a string.\n",
    },
  ],
  name: "String.Chars",
  callbacks: [
    {
      name: "to_string/1",
      type: "callback",
      specs: ["@callback to_string(t()) :: String.t()"],
      documentation: "Converts `term` to a string.\n",
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
