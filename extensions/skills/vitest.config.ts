import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": resolve(__dirname, "test/raycast-api.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.live.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
