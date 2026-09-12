import type { ModuleDoc } from "../types";

export const Date_Range: ModuleDoc = {
  functions: [],
  name: "Date.Range",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %Date.Range{\n        first: Date.t(),\n        first_in_iso_days: days(),\n        last: Date.t(),\n        last_in_iso_days: days(),\n        step: pos_integer() | neg_integer()\n      }",
      ],
      documentation: null,
    },
  ],
};
