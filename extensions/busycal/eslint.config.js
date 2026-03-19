const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-config-prettier/flat");
const raycast = require("@raycast/eslint-plugin");
const typescript = require("typescript-eslint");

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
  prettier,
];
