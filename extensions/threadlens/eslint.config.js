const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");

module.exports = defineConfig([
  {
    ignores: ["raycast-env.d.ts"],
  },
  ...raycast.flat(),
]);
