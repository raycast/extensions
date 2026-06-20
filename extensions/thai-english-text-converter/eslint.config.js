// eslint-disable-next-line @typescript-eslint/no-require-imports
const { defineConfig } = require("eslint/config");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([...raycastConfig]);
