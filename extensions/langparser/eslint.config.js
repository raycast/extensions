import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig([
  ...raycastConfig,
  {
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/indent": ["error", 2],
    },
  },
]);
