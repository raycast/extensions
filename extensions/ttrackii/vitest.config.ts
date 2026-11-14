import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": fileURLToPath(
        new URL("./tests/raycast-mock.tsx", import.meta.url),
      ),
    },
  },
  test: { setupFiles: ["./tests/setup.ts"] },
});
