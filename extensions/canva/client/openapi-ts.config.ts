import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../openapi/spec.yml",
  client: "@hey-api/client-axios",
  experimentalParser: true,
  output: {
    path: "./ts",
    format: "prettier",
    lint: "eslint",
  },
  plugins: [
    {
      name: "@hey-api/sdk",
      asClass: true,
    },
    {
      name: "@hey-api/typescript",
      enums: "javascript",
    },
  ],
});