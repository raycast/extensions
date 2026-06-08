/* eslint-disable @typescript-eslint/no-require-imports */

module.exports = [
  {
    ignores: ["eslint.config.js", "raycast-env.d.ts"],
  },
  ...require("@raycast/eslint-config").flat(),
];
