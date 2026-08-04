import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  // src/vendor/ contains auto-generated files (from scripts/vendor-oxvg-wasm.mjs)
  // that should not be linted.
  { ignores: ["src/vendor/"] },
]);
