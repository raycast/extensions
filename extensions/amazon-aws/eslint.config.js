const typescript = require("typescript-eslint");
const raycast = require("@raycast/eslint-plugin");
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  ...typescript.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
      },
    },
  },
  ...raycast.configs.recommended,
  {
    rules: {
      "@raycast/prefer-title-case": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_|^error$",
        },
      ],
    },
  },
];
