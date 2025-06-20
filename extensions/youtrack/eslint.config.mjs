import tseslint from "typescript-eslint";
import globals from "globals";
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import vitest from "@vitest/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
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
      reactPlugin.configs.flat.recommended,
      reactPlugin.configs.flat["jsx-runtime"],
      reactHooks.configs["recommended-latest"],
      eslintPluginPrettierRecommended,
      {
        settings: {
          react: {
            version: "detect",
          },
        },
        languageOptions: {
          globals: {
            ...globals.node,
          },

          parser: tseslint.parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
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
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": "error",
    },
  },
  {
    files: ["**/*.test.*"],
    ...vitest.configs.recommended,
  },
);
