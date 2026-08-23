import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@raycast/api": path.resolve(__dirname, "src/__tests__/__mocks__/@raycast/api.ts"),
      "@raycast/utils": path.resolve(__dirname, "src/__tests__/__mocks__/@raycast/utils.ts"),
    },
  },
});
