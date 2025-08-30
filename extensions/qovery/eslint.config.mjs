import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "off", // Turn off as JSX components are often flagged incorrectly
      "no-console": "off",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
    },
  },
];
