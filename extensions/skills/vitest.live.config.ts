import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.live.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
