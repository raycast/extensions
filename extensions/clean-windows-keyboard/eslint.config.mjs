import { defineConfig } from "eslint/config";
import reactPlugin from "eslint-plugin-react";
import globals from "globals";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig.flat(),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: reactPlugin,
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn"
    },
  },
  {
    ignores: ["dist/**", "src/native/**", "assets/**"]
  }
]);
