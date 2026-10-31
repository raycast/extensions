const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");

module.exports = defineConfig([
  { ignores: ["dist/**", "harness/.build/**"] },
  ...raycast,
]);
