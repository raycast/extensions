const raycastConfig = require("@raycast/eslint-config").flat();

module.exports = [
  {
    ignores: ["node_modules/**", "dist/**", ".raycast-build/**", "raycast-env.d.ts", "eslint.config.js"],
  },
  ...raycastConfig,
];
