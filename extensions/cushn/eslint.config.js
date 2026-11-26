const { defineConfig, globalIgnores } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

// A copy of the app's parser, linted in the app's repo.
module.exports = defineConfig([globalIgnores(["src/expressionParser/"]), ...raycastConfig]);
