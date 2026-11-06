import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@raycast/api": fileURLToPath(new URL("./tests/fixtures/raycast.cjs", import.meta.url)) },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
