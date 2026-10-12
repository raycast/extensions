import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          exclude: ["**/node_modules/**", "src/**/*.integration.test.ts"],
          setupFiles: ["test/setup.ts"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          testTimeout: 90_000,
          hookTimeout: 90_000,
        },
      },
    ],
  },
});
