import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      // Generated command files are one line of wiring each, and six of the
      // ten test files scan source as text and execute almost no product
      // code, so a global threshold would measure the wrong thing.
      // Thresholds are scoped to the two modules that carry real logic.
      exclude: ["src/__tests__/**", "src/section-*.tsx", "src/sections.ts"],
      thresholds: {
        "src/api/client.ts": { statements: 60, branches: 55 },
        "src/utils/article.ts": { statements: 85, branches: 85 },
      },
    },
  },
});
