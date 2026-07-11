import { CodegenConfig } from "@graphql-codegen/cli";
import * as dotenv from "dotenv";
dotenv.config();

const config: CodegenConfig = {
  schema: [
    {
      "https://api.github.com/graphql": {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          'user-agent': 'node.js'
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
