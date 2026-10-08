import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".raycast", "src/__tests__/mocks/**", "src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: [
        "src/lib/**/*.ts",
        "src/api/**/*.ts",
        "src/hooks/**/*.ts",
        "src/hooks/**/*.tsx",
        "src/components/**/*.ts",
        "src/components/**/*.tsx",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/*.d.ts",
        "src/**/index.ts", // Barrel exports
        // Exclude legacy endpoints file (deprecated)
        "src/api/endpoints.ts",
      ],
      // Coverage thresholds - will be raised as more tests are added
      // Target: 85% after completing all test phases
      thresholds: {
        statements: 35,
        branches: 24,
        functions: 27,
        lines: 35,
      },
    },
    setupFiles: ["./src/__tests__/setup.ts"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@raycast/api": path.resolve(__dirname, "./src/__tests__/mocks/raycast-api.ts"),
      "@raycast/utils": path.resolve(__dirname, "./src/__tests__/mocks/raycast-utils.ts"),
    },
  },
});
