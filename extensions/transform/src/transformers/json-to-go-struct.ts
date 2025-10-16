export const TransformJSONtoGoStruct = {
  from: "JSON",
  to: "Go Struct",
  transform: async (value: string) => {
    const { default: jsonToGo } = await import("json-to-go");
    const { default: gofmt } = await import("gofmt.js");
    return gofmt(jsonToGo(value).go);
  },
};
