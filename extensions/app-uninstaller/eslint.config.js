const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = defineConfig([
  ...raycastConfig,
  {
    // The Raycast config does not enable these. A hook placed after a
    // conditional return changes the hook order between renders and corrupts
    // React's state for every hook in the component — it is not a style issue.
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);
