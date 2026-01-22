import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";

export default [
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    ignores: ["node_modules", ".raycast"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      react: {
        version: "18"
      }
    },
    plugins: {
      react
    },
    rules: {
      "no-unused-vars": "error",
      "no-console": "off",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off"
    }
  },
  js.configs.recommended,
  ...tseslint.configs.recommended
];
