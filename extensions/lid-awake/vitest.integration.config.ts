import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/integration/**/*.test.ts"],
    environment: "node",
    // Integration tests share one real pmset setting and one sudoers file, so they must not overlap.
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
