import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
  },
]);