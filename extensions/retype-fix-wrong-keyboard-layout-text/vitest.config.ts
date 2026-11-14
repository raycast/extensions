import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": path.resolve(__dirname, "testing/raycast-api-stub.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
  },
});
