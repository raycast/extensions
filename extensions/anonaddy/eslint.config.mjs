import raycast from "@raycast/eslint-config";
import { defineConfig } from "eslint/config";
import * as importing from "eslint-plugin-import-x";

export default defineConfig([
  importing.flatConfigs.recommended,
  importing.flatConfigs.typescript,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],
      "import-x/exports-last": "error",
      "import-x/first": "error",
      "import-x/order": [
        "error",
        {
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
          groups: [["builtin", "external"], "internal", ["parent", "sibling"], "type"],
          "newlines-between": "always",
          pathGroups: [
            {
              group: "internal",
              pattern: "~/**",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["~/**"],
        },
      ],
      "sort-imports": [
        "error",
        {
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          allowSeparatedGroups: true,
        },
      ],
    },
  },
  ...raycast,
]);
