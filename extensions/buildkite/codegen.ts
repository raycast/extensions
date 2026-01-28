import { CodegenConfig } from "@graphql-codegen/cli"

const config: CodegenConfig = {
  documents: ["src/**/*.graphql"],
  generates: {
    "./src/generated/graphql.ts": {
      config: {
        avoidOptionals: true,
        enumsAsTypes: true,
        skipTypename: true,
      },
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-graphql-request",
      ],
    },
  },
  schema: "schema.graphql",
}

export default config
