const raycast = require("@raycast/eslint-config");
const { defineConfig } = require("eslint/config");
module.exports = defineConfig([
  { ignores: ["dist/**", "node_modules/**"] },
  ...raycast.flat(Infinity),
]);
