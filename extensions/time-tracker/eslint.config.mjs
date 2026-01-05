import js from "@eslint/js";
import typescript from "typescript-eslint";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";

export default [
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
  prettier,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
