import eslint from "@eslint/js";
import type { Linter } from "eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import { includeIgnoreFile } from "@eslint/compat";
import { fileURLToPath } from "node:url";

const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

export default [
  includeIgnoreFile(gitignorePath),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ["**/.history", "**/.husky", "**/.vscode", "**/coverage", "**/dist", "**/node_modules"],
  },
  {
    plugins: {
      typescriptEslint: tseslint.plugin,
      prettier,
      react: eslintPluginReact,
      "react-hooks": eslintPluginReactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: tseslint.parser,
    },
    rules: {
      "prettier/prettier": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
] as Linter.Config[];
