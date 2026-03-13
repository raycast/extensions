import type { ModuleDoc } from "../types";

export const List_Chars: ModuleDoc = {
  functions: [
    {
      name: "to_charlist/1",
      type: "function",
      specs: ["@spec to_charlist(t()) :: charlist()"],
      documentation: "Converts `term` to a charlist.\n",
    },
  ],
  name: "List.Chars",
  callbacks: [
    {
      name: "to_charlist/1",
      type: "callback",
      specs: ["@callback to_charlist(t()) :: charlist()"],
      documentation: "Converts `term` to a charlist.\n",
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
