import { JSONWasm } from "json-wasm";

export const TransformJSONtoJSONSchema = {
  from: "JSON",
  to: "JSON Schema",
  transform: async (value: string) => {
    JSON.parse(value);
    return await JSONWasm("Root", value, {
      output_mode: "json_schema",
    });
  },
};
