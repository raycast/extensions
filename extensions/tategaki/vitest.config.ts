import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      "@raycast/api": new URL("./__mocks__/@raycast/api.ts", import.meta.url).pathname,
    },
  },
});
