import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/models/interfaces.ts"],
      reporter: ["text", "html", "lcov", "json-summary"],
      thresholds: {
        statements: 65,
        branches: 60,
        functions: 45,
        lines: 65,
        "src/models/Process.ts": { statements: 95, branches: 85, functions: 100, lines: 95 },
        "src/utilities/killProcess.ts": { statements: 100, branches: 95, functions: 100, lines: 100 },
        "src/tools/*.ts": { statements: 100, branches: 95, functions: 100, lines: 100 },
      },
    },
  },
});
