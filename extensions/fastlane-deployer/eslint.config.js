const js = require("@eslint/js");
const prettier = require("eslint-config-prettier/flat");
const raycast = require("@raycast/eslint-plugin");
const ts = require("typescript-eslint");

module.exports = [
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        Buffer: "readonly",
        NodeJS: "readonly",
        clearInterval: "readonly",
        process: "readonly",
        setInterval: "readonly",
      },
    },
    plugins: {
      "@raycast": raycast,
    },
    rules: {
      "@raycast/prefer-ellipsis": "warn",
      "@raycast/prefer-title-case": "warn",
    },
  },
  prettier,
];
