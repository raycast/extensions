const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");

module.exports = defineConfig([
  raycast,
  {
    ignores: ["dist/**", "node_modules/**", ".raycast/**"],
  },
]);
