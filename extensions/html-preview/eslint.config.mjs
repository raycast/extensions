import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin";
import eslintPluginReact from "eslint-plugin-react";
import typescriptEslintParser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.tsx", "src/** /*.ts"],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
      "react": eslintPluginReact,
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
