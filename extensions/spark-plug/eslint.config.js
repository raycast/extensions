// Bypasses an upstream bug in @raycast/eslint-config that fails to spread an
// array entry from @raycast/eslint-plugin. Build the flat config from the same
// pieces ourselves and spread correctly.
const prettier = require("eslint-config-prettier/flat");
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
      globals: { ...globals.node },
    },
  },
  ...raycast.configs.recommended,
  prettier,
];
