import { defineConfig } from "vitest/config";

const mock = (file: string) => new URL(`./src/test/${file}`, import.meta.url).pathname;

export default defineConfig({
  resolve: {
    // Raycast APIs only exist inside Raycast; views are tested against accessible DOM doubles.
    alias: {
      "@raycast/api": mock("raycast-api.tsx"),
      "@raycast/utils": mock("raycast-utils.tsx"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "scripts/**/*.mts"],
      // Test doubles and helpers are not shipped code.
      exclude: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mts", "src/test/**"],
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
