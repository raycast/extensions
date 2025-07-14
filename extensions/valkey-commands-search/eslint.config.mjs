// Using a simpler ESLint configuration to avoid circular reference issues
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
  // Base JS/TS configuration
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Project-specific rules
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Add any specific rules here
      "no-unused-vars": "warn",
      "no-console": "warn",
    },
  },
]);
