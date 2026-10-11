import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      "@raycast/api": fileURLToPath(
        new URL("./tests/raycast-api.ts", import.meta.url),
      ),
    },
  },
});
