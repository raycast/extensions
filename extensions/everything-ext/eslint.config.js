const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");
const globals = require("globals");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  ...compat.extends("@raycast/eslint-config"),
  {
    files: ["src/**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.es2020,
        ...globals.node,
      }
    }
  }
];
