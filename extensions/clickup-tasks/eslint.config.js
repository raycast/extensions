// eslint-disable-next-line @typescript-eslint/no-require-imports
const raycastConfig = require("@raycast/eslint-config");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const perfectionist = require("eslint-plugin-perfectionist");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    plugins: { perfectionist },
    rules: {
      "perfectionist/sort-imports": [
        "error",
        {
          groups: [
            "type",
            ["builtin", "external"],
            "internal-type",
            "internal",
            ["parent-type", "sibling-type", "index-type"],
            ["parent", "sibling", "index"],
            "object",
            "unknown",
          ],
          internalPattern: ["^~/.+"],
          newlinesBetween: "never",
          order: "asc",
          type: "alphabetical",
        },
      ],
      "perfectionist/sort-interfaces": ["error", { order: "asc", type: "alphabetical" }],
      "perfectionist/sort-jsx-props": ["error", { order: "asc", type: "alphabetical" }],
      "perfectionist/sort-object-types": ["error", { order: "asc", type: "alphabetical" }],
      "perfectionist/sort-objects": ["error", { order: "asc", partitionByComment: true, type: "alphabetical" }],
    },
  },
  { ignores: ["raycast-env.d.ts", "*.d.ts"] },
]);
