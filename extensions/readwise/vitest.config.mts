import { defineConfig } from "vitest/config";

process.env.TZ = "UTC";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    mockReset: true,
    coverage: {
      provider: "v8",
      include: ["src/utils.ts", "src/api/fetcher.ts", "src/dailyreview.ts", "src/library.ts"],
      reporter: ["text", "html"],
    },
  },
});
