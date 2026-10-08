import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@raycast/api": path.resolve(__dirname, "tests/mocks/raycast-api.ts"),
    },
  },
});
