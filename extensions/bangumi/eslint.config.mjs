import { defineConfig } from "eslint/config"
import raycastConfig from "@raycast/eslint-config"

export default defineConfig([
  ...raycastConfig,
  {
    rules: {
      "func-style": ["error", "expression"],
    },
  },
])
