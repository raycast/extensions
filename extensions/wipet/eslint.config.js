// Raycast's @raycast/eslint-config still uses the legacy .eslintrc format.
// FlatCompat translates it to ESLint 9's flat config.
const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const path = require("node:path");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: path.resolve(__dirname, "node_modules"),
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = [
  ...compat.extends("@raycast"),
  {
    ignores: ["dist/**", "node_modules/**", ".raycast/**"],
  },
];
