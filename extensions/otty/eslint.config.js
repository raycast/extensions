const js = require("@eslint/js");
const raycast = require("@raycast/eslint-plugin");
const prettier = require("eslint-config-prettier/flat");
const globals = require("globals");
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
