import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@raycast/api": path.resolve(import.meta.dirname, "src/__mocks__/@raycast/api.ts"),
    },
  },
});
