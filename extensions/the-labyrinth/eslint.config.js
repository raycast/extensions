const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = defineConfig([
  ...raycastConfig,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);
