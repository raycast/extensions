// Re-export of the bundled OpenAPI 3.1 document. Importing the JSON via this
// module rather than directly from ./generated/openapi.json gives consumers a
// stable path that survives a future change to the on-disk layout.
import openapi from "./generated/openapi.json" with { type: "json" };

export type OpenApiSpec = typeof openapi;
export const openapiSpec: OpenApiSpec = openapi;
