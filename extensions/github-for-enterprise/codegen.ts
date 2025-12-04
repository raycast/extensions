import { CodegenConfig } from "@graphql-codegen/cli";
import * as dotenv from "dotenv";
dotenv.config();

const config: CodegenConfig = {
  schema: [
    {
      [`${process.env.GRAPHQL_URL}`]: {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          "User-Agent": "Raycast",
        },
      },
    },
  ],
  documents: ["src/**/*.graphql"],
  generates: {
    "./src/generated/graphql.ts": {
      plugins: ["typescript", "typescript-operations", "typescript-graphql-request"],
    },
  },
  hooks: { afterAllFileWrite: ["ray lint --fix"] },
};

export default config;
