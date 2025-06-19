import tseslint from "typescript-eslint";
import globals from "globals";
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import vitest from "@vitest/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import * as reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["raycast-env.d.ts"],
    extends: [
      eslint.configs.recommended,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      eslintPluginPrettierRecommended,
      {
        languageOptions: {
          globals: {
            ...globals.node,
          },

          parser: tseslint.parser,
        },
      },
    ],
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
          disallowTypeAnnotations: false,
        },
      ],
      "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
      "import/no-unresolved": "off",
    },
  },
  {
    files: ["**/*.test.*"],
    ...vitest.configs.recommended,
  },
);
