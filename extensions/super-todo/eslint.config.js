const raycast = require("@raycast/eslint-config");

module.exports = [
  ...raycast,
  { ignores: ["dist/**", ".build/**", "node_modules/**", "raycast-env.d.ts"] },
];
