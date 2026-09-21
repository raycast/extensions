const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");

module.exports = defineConfig([...raycast, { ignores: ["src/__tests__/**"] }]);
