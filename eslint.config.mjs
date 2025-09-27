import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  ...raycastConfig,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-empty": "off",
      "prefer-const": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "warn",
    },
  },
]);
