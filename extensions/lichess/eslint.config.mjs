import raycast from "@raycast/eslint-config";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([
  {
    ignores: ["coverage/**", "dist/**", "raycast-env.d.ts"],
  },
  ...raycast,
  {
    plugins: {
      "react-hooks": reactHooks,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      complexity: ["warn", 8],
      "max-depth": ["warn", 3],
      "max-lines": [
        "warn",
        {
          max: 250,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "max-lines-per-function": [
        "warn",
        {
          max: 80,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "max-params": ["warn", 4],
      "max-statements": ["warn", 35],
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": "error",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          vars: "all",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
]);
