import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@raycast/api": path.resolve(__dirname, "src/test/raycast-api-stub.ts"),
    },
  },
});
