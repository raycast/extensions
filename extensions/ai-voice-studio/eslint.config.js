const raycast = require("@raycast/eslint-config");

let defineConfig = (config) => config;
try {
  ({ defineConfig } = require("eslint/config"));
} catch {
  // Raycast's current local CLI still resolves ESLint 8, which does not export eslint/config.
}

module.exports = defineConfig(raycast.flat());
