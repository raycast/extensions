import { defineConfig, globalIgnores } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  // Generated files — the catalog bundle comes from the site registry and
  // raycast-env.d.ts is emitted by `ray`; neither is hand-written.
  globalIgnores([
    "src/catalog.gen.js",
    "src/catalog.gen.d.ts",
    "src/catalog.entry.ts",
    "raycast-env.d.ts",
  ]),
]);
