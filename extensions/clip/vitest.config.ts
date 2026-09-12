import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@raycast/api": path.resolve("src/__mocks__/@raycast/api.ts"),
    },
  },
});
