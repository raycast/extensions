import { CodegenConfig } from "@graphql-codegen/cli";
import * as dotenv from "dotenv";
dotenv.config();

const config: CodegenConfig = {
  schema: [
    {
      "https://api.github.com/graphql": {
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
  // The lint command does not expect any additional arguments, so we pass # to ignore them
  hooks: { afterAllFileWrite: ["ray lint --fix #"] },
};

export default config;
