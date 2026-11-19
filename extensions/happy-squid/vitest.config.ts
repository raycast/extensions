import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@raycast/api": resolve(__dirname, "tests/raycast-api.tsx") } },
  test: { include: ["tests/**/*.test.tsx", "tests/**/*.test.ts"] },
});
