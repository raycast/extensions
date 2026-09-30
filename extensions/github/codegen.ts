import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "schema/github.graphql",
  documents: ["src/**/*.graphql"],
  generates: {
    "./src/generated/schema.ts": {
      plugins: ["typescript"],
      config: {
        defaultScalarType: "any",
      },
    },
    "./src/generated/graphql.ts": {
      plugins: [
        {
          add: {
            content: 'export * from "./schema";',
            placement: "append",
          },
        },
        "typescript-operations",
        "typescript-graphql-request",
      ],
      config: {
        defaultScalarType: "any",
        importSchemaTypesFrom: "./src/generated/schema",
        namespacedImportName: "Types",
      },
    },
  },
  hooks: { afterAllFileWrite: ["prettier --write ./src/generated/schema.ts ./src/generated/graphql.ts"] },
};

export default config;
