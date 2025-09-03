// ESLint v9+ flat config for Raycast extensions
// Uses @raycast/eslint-config which already composes eslint, typescript-eslint, and prettier
// Adds basic ignore patterns for build output and dependencies

// Use CommonJS export to avoid ESM nuances in various environments
const raycast = require("@raycast/eslint-config");

// The Raycast config currently includes eslint-config-prettier/flat as an array;
// flatten to avoid nested arrays which ESLint rejects.
const base = Array.isArray(raycast) && typeof raycast.flat === "function" ? raycast.flat() : [].concat(raycast);

module.exports = [
  ...base,
  {
    ignores: ["eslint.config.js", "dist/**", "node_modules/**"],
  },
];
