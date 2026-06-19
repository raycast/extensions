const raycast = require("@raycast/eslint-config");

// @raycast/eslint-config 2.1.1 ships one nested array element (it forgets to
// spread the plugin's recommended config), which ESLint 9 flat config rejects.
// Flatten it before use.
module.exports = [
  { ignores: ["dist/**", "node_modules/**", "raycast-env.d.ts"] },
  ...raycast.flat(),
];
