import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Helpers import @raycast/api for preferences; tests use a small stub instead of the Raycast runtime.
    alias: { "@raycast/api": fileURLToPath(new URL("./test/mocks/raycast-api.ts", import.meta.url)) },
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
