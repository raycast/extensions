import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": resolve(root, "src/test/raycast-api.ts"),
    },
  },
  test: {
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
  },
});
