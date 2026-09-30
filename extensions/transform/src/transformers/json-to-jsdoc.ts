export const TransformJSONtoJSDoc = {
  from: "JSON",
  to: "JSDoc",
  transform: async (value: string) => {
    const { jsonToJSDoc } = await import("json-to-jsdoc");
    return jsonToJSDoc(value);
  },
};
