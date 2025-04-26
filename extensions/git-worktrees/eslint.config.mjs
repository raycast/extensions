import raycastConfig from "@raycast/eslint-config";
import { defineConfig } from "eslint/config";

export default defineConfig([
  ...raycastConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
]);
