import { defineConfig } from 'vitest/config';
import { resolve } from "path";

export default defineConfig({
  test: {
    include: [resolve(__dirname, "test/**/*.{test,spec}.{ts,tsx}")],
    environment: "jsdom",
    globals: true,
    setupFiles: [resolve(__dirname, "test/setup.ts")],
  },
  resolve: {
    alias: {
      "@raycast/api": resolve(__dirname, "test/mocks/raycast-api.ts"),
    },
  },
});
