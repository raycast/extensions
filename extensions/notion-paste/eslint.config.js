const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycast.flat(),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
