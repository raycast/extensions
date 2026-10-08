const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycast,
  // Its table predates Raycast 2.0, and its autofix would rebind the brightness and color shortcuts.
  { rules: { "@raycast/prefer-common-shortcut": "off" } },
]);
