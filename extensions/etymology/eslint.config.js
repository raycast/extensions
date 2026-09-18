module.exports = [
  ...require("@raycast/eslint-config").flat(),
  {
    ignores: ["dist/**", "node_modules/**", "raycast-env.d.ts", "assets/langcodes.json"],
  },
];
