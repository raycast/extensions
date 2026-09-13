import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/live/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
