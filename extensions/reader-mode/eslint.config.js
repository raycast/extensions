const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  // Local agent skills, gitignored and not part of the extension.
  { ignores: [".claude/"] },
  ...raycastConfig,
]);
