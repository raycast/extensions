import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".raycast"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts", "src/types/**/*.ts"],
      exclude: ["src/__tests__/**", "src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@raycast/api": resolve(__dirname, "src/__tests__/__mocks__/@raycast/api.ts"),
      "@raycast/utils": resolve(__dirname, "src/__tests__/__mocks__/@raycast/utils.ts"),
    },
  },
});
