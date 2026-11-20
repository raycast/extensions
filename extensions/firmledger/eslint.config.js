const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    // MCP payloads are dynamic JSON, so `any` is intentional in the client and formatters.
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
]);
