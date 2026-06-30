const raycast = require("@raycast/eslint-config");

module.exports = [
  {
    ignores: ["eslint.config.js", "raycast-env.d.ts"],
  },
  ...raycast,
];
