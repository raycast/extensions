import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    alias: { "@raycast/api": new URL("./tests/raycast-api-mock.ts", import.meta.url).pathname },
  },
});
