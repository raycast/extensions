const js = require("@eslint/js");
const typescript = require("typescript-eslint");
const raycast = require("@raycast/eslint-plugin");
const prettier = require("eslint-config-prettier/flat");
const globals = require("globals");

module.exports = typescript.config(
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
  raycast.configs.recommended,
  prettier
);
