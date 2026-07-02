const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

require("@rushstack/eslint-patch/modern-module-resolution");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = [...compat.extends("@raycast/eslint-config")];
