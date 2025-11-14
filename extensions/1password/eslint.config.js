import raycastConfig from "@raycast/eslint-config";
import { importX } from "eslint-plugin-import-x";
import perfectionist from 'eslint-plugin-perfectionist';
import { defineConfig } from "eslint/config";


export default defineConfig([
  ...raycastConfig,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  perfectionist.configs['recommended-natural'],
  { ignores: ["raycast-env.d.ts"] },
  {
    rules: {
      "@raycast/prefer-title-case": [
        "warn",
        {
          extraFixedCaseWords: ["1Password"],
        },
      ],
      "no-await-in-loop": "error",
      "no-duplicate-imports": "error",
      "no-else-return": "error",
      "no-empty-function": "error",
      "no-eval": "error",
      "no-promise-executor-return": "error",
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", next: "*", prev: "class" },
        { blankLine: "always", next: "*", prev: "block-like" },
        { blankLine: "always", next: "*", prev: "const" },
        { blankLine: "always", next: "default", prev: "*" },
        { blankLine: "always", next: "export", prev: "*" },
        { blankLine: "always", next: "*", prev: "export" },
        { blankLine: "always", next: "function", prev: "*" },
        { blankLine: "always", next: "try", prev: "*" },
        { blankLine: "never", next: "const", prev: "const" },
        { blankLine: "never", next: "export", prev: "export" },
      ],
      "perfectionist/sort-classes": ["error", { partitionByNewLine: true }],
      "prefer-const": "error",
      "prefer-template": "error",
      "require-await": "error",
    },
  },
]);
