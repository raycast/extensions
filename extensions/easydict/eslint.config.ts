import raycastConfig from "@raycast/eslint-config";
import { defineConfig } from "eslint/config";
import importPlugin from "eslint-plugin-import-x";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([
  ...raycastConfig,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      import: importPlugin,
      "unused-imports": unusedImports,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
]);
