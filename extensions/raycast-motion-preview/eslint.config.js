const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

// @raycast/eslint-config nests an array (raycast.configs.recommended) as a
// single element, which ESLint 9's flat-config loader rejects. Flatten it.
module.exports = defineConfig(raycastConfig.flat(Infinity));
