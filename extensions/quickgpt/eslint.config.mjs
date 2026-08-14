import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import typescript from "typescript-eslint";
import prettier from "eslint-config-prettier/flat";
import raycastPlugin from "@raycast/eslint-plugin";
import globals from "globals";

export default defineConfig([
  js.configs.recommended,
  ...typescript.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
      },
    },
  },
  ...raycastPlugin.configs.recommended, // This is an array, so we spread it
  prettier,
  {
    ignores: ["dist/**", "node_modules/**", "*.config.*"],
  },
]);
