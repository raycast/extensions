import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": new URL("./src/__mocks__/@raycast/api.ts", import.meta.url).pathname,
    },
  },
  test: {
    clearMocks: true,
    include: ["src/**/*.test.ts"],
    mockReset: true,
    restoreMocks: true,
  },
});
