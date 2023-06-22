export const TransformJSONtoGraphQL = {
  from: "JSON",
  to: "GraphQL",
  transform: async (value: string) => {
    const { jsonToSchema } = await import("@walmartlabs/json-to-simple-graphql-schema/lib");
    return jsonToSchema({ jsonInput: value }).value;
  },
};
