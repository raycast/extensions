const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");
const nodePlugin = require("eslint-plugin-n");

module.exports = defineConfig([
  ...raycastConfig,
  {
    plugins: {
      n: nodePlugin,
    },
    rules: {
      "n/prefer-node-protocol": ["error", { version: ">=16.0.0" }],
    },
  },
]);
