import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    testTimeout: 10_000,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/providers/**/*.ts", "src/cleanup.ts", "src/storage.ts"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/providers/index.ts"],
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        statements: 98,
        branches: 80,
        functions: 98,
        lines: 98,
      },
    },
  },
});
