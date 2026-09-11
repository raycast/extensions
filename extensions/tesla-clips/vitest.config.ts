import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [["**/*.{test,spec}.tsx", "jsdom"]],
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".raycast", "src/__tests__/setup.ts", "src/__tests__/__mocks__/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.{ts,tsx}", "src/constants.ts"],
      exclude: ["src/lib/index.ts", "src/lib/status-config.ts", "src/**/*.d.ts", "src/__tests__/**"],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@raycast/api": resolve(__dirname, "./src/__tests__/__mocks__/@raycast/api.ts"),
    },
  },
});
