const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// `ray lint` runs ESLint in flat-config mode. Without this file it walks up to
// the monorepo-root eslint.config.js (which targets ESLint 9), so we keep a
// self-contained flat config here that bridges the legacy @raycast/eslint-config.
module.exports = [
  {
    ignores: ["dist/**", "node_modules/**", "raycast-env.d.ts"],
  },
  ...compat.extends("@raycast/eslint-config"),
];
