import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    unstubGlobals: true,
    setupFiles: ["./src/test/console.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/test/integration/**"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["src/test/integration/**/*.{integration,macos}.test.ts"],
          environment: "node",
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["node_modules/**", "src/test/**", "**/*.test.{ts,tsx}", "**/*.d.ts", "**/*.config.*"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
      "@raycast/api": resolve(import.meta.dirname, "./src/test/mocks/raycast-api-mock.ts"),
      "@raycast/utils": resolve(import.meta.dirname, "./src/test/mocks/raycast-utils-mock.ts"),
    },
  },
});
