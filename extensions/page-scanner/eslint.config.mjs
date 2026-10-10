import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  // Written by scripts/vendor-cli.mjs.
  { ignores: ["src/vendor/", "assets/", "raycast-env.d.ts"] },
]);
