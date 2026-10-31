const raycast = require("@raycast/eslint-config");
const { defineConfig } = require("eslint/config");
module.exports = defineConfig([
  ...raycast,
  { rules: { "@raycast/prefer-title-case": "off" } },
]);
