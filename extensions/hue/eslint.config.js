const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycast,
  // Its MoveUp/MoveDown predate Raycast 2.0's ⌘⌥↑/↓, so its autofix would rebind the brightness shortcuts to them.
  { rules: { "@raycast/prefer-common-shortcut": "off" } },
]);
