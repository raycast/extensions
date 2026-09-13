import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  // tests は Raycast のバンドル対象外なので対象から除く
  { ignores: ["tests/**"] },
  ...raycastConfig,
  {
    rules: {
      "@raycast/prefer-title-case": ["warn", { extraFixedCaseWords: ["In", "Out"] }],
    },
  },
]);
