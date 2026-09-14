const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
  },
  ...raycastConfig.flat(),
]);
