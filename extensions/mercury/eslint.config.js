const { defineConfig, globalIgnores } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  // Vendored bundle (npm run copy-runner) and the file Raycast generates.
  globalIgnores(["assets/raycast-downloader-runner.js", "raycast-env.d.ts"]),
  ...raycastConfig,
  {
    files: ["eslint.config.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);
