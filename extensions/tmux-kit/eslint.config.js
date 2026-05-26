const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const raycast = require("@raycast/eslint-plugin");
const prettier = require("eslint-config-prettier/flat");
const globals = require("globals");

module.exports = defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
    },
  },
  ...raycast.configs.recommended,
  prettier,
]);
