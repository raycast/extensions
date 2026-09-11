const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = defineConfig([
  ...raycastConfig,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      // ray's shared config omits these entirely — a Rules-of-Hooks violation
      // shipped through a green `ray lint` on 2026-09-02. Never again.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",
      // Underscore-prefixed args are deliberate: cache-key-only params (e.g. the
      // token fingerprint threaded through useCachedPromise) are named, unused.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
]);
