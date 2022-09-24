export const TransformJSONtoJSDoc = {
  from: "JSON",
  to: "JSDoc",
  transform: async (value: string) => {
    const { convert } = await import("../lib/json-to-jsdoc");
    return convert(value);
  },
};
