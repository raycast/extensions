import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": fileURLToPath(
        new URL("./test-support/raycast-api.ts", import.meta.url),
      ),
    },
  },
});
