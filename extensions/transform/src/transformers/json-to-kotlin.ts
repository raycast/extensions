import { JSONWasm } from "json-wasm";

export const TransformJSONtoKotlin = {
  from: "JSON",
  to: "Kotlin",
  transform: async (value: string) => {
    JSON.parse(value);
    return await JSONWasm("Root", value, { output_mode: "kotlin" });
  },
};
