const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  allConfig: js.configs.all,
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

let defineConfig = (config) => config;
try {
  ({ defineConfig } = require("eslint/config"));
} catch {
  // Raycast's current local CLI still resolves ESLint 8, which does not export eslint/config.
}

module.exports = defineConfig([...compat.extends("@raycast")]);
