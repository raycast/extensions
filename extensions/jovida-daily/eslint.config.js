const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  { ignores: ["src/vendor/**"] },
  ...require("@raycast/eslint-config"),
]);
