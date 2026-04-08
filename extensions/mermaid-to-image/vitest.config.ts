import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": path.resolve(__dirname, "test-stubs/raycast-api.ts"),
      "@raycast/utils": path.resolve(__dirname, "test-stubs/raycast-utils.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
