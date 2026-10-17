import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      "@raycast/api": new URL("./src/__tests__/__mocks__/raycast-api.ts", import.meta.url).pathname,
    },
  },
});
