import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["tests/live.test.ts", "node_modules/**"],
  },
});
