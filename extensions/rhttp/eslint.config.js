import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
]);
