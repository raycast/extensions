const raycast = require("@raycast/eslint-config");

module.exports = [
  {
    ignores: ["dist/**", "node_modules/**", "raycast-env.d.ts"],
  },
  ...raycast,
  {
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
