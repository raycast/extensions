import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@raycast/api": fileURLToPath(new URL("./tests/mocks/raycast.tsx", import.meta.url)),
      "@raycast/utils": fileURLToPath(new URL("./tests/mocks/utils.tsx", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/types/**"],
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      thresholds: { lines: 85, statements: 85, functions: 85, branches: 80 },
    },
  },
});
