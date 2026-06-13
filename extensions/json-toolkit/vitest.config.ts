import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/lib/**/*.ts"],
    },
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
