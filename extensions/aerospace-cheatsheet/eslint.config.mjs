// ESLint 9 flat config. `ray lint` runs ESLint, which since v9 requires this file
// rather than an .eslintrc — without it the lint step fails before checking anything.
import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    // Generators and the test suite are plain Node, outside the Raycast runtime.
    ignores: ["assets/**", "metadata/**", ".test-build/**", "tools/.screenshot-build/**"],
  },
]);
