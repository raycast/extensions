import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@raycast/api": path.resolve(__dirname, "tests/__mocks__/@raycast/api.ts")
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
