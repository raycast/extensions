import { defineConfig } from "vitest/config";
import { dirname, resolve } from "path";
import { createRequire } from "node:module";

// Resolve React from @raycast/api's own dependency tree so the alias works
// whether the package manager nests React under @raycast/api or hoists it.
const require = createRequire(import.meta.url);
const raycastApiRoot = dirname(require.resolve("@raycast/api/package.json"));
const reactRoot = dirname(require.resolve("react/package.json", { paths: [raycastApiRoot] }));

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
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/__tests__/**", "src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
      // Honest floors measured against the full src/** surface — a ratchet,
      // never lower them. Raise them as tests are added.
      thresholds: {
        // Separate, higher floor for the library layer, where the
        // correctness-bearing logic lives — honest measured values, same
        // ratchet rule as the aggregate below.
        "src/lib/**/*.ts": {
          statements: 80,
          branches: 74,
          functions: 85,
          lines: 81,
        },
        statements: 43,
        branches: 36,
        functions: 36,
        lines: 44,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "react/jsx-runtime": resolve(__dirname, "src/__tests__/__mocks__/react/jsx-runtime.ts"),
      "react/jsx-dev-runtime": resolve(__dirname, "src/__tests__/__mocks__/react/jsx-runtime.ts"),
      "@raycast/api": resolve(__dirname, "src/__tests__/__mocks__/@raycast/api.ts"),
      react: reactRoot,
      "@raycast/utils": resolve(__dirname, "src/__tests__/__mocks__/@raycast/utils.ts"),
    },
  },
});
