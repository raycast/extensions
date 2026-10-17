import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import raycast from "@raycast/eslint-plugin";
import globals from "globals";
import typescript from "typescript-eslint";

export default defineConfig([
  js.configs.recommended,
  ...typescript.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        ...globals.node,
      },
    },
  },
  ...raycast.configs.recommended,
  prettier,
]);
