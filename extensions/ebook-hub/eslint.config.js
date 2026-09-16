const raycastConfig = require("@raycast/eslint-config");

module.exports = [
  {
    ignores: ["dist/**", "raycast-env.d.ts"],
  },
  ...raycastConfig,
];
