/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Only mock external boundaries - let internal hooks run naturally
      "@raycast/api": path.resolve(__dirname, "./src/__mocks__/@raycast/api.tsx"),
      "@raycast/utils": path.resolve(__dirname, "./src/__mocks__/@raycast/utils.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "./src/setupTests.ts")],
    globals: true,
    testTimeout: 10000,
    reporters: ["verbose", "html"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/setupTests.ts", "src/__mocks__/**", "src/__tests__/**", "src/types/**"],
      thresholds: {
        global: {
          // Behavior-focused coverage thresholds
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Exclude non-testable files from coverage requirements
        "src/types/": {
          lines: 0,
          functions: 0,
          branches: 0,
          statements: 0,
        },
      },
    },
    include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}", "src/**/*.(test|spec).{ts,tsx}"],
    exclude: ["**/test-utils.{ts,tsx}", "**/setup.ts", "**/helpers.ts", "src/types/**/*"],
  },
});
