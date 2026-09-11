import { defineConfig, globalIgnores } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  globalIgnores(["src/catalog.gen.js"]),
]);
