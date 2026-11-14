import { defineConfig } from 'vitest/config';
import { resolve } from "path";

export default defineConfig({
  test: {
    // Relative glob: absolute paths contain backslashes on Windows, which break glob matching
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
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
