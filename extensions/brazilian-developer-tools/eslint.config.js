import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  ...raycastConfig,
  eslintConfigPrettier,
]);
