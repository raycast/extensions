const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    rules: {
      // The title-case rule keeps "up" lowercase as a preposition, so it insists on "Move up"
      // while leaving "Move Down" alone. Here it's a direction, not a preposition — pin it so the
      // two reorder actions match each other.
      "@raycast/prefer-title-case": ["warn", { extraFixedCaseWords: ["Up"] }],
    },
  },
]);
