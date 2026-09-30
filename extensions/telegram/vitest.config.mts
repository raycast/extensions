import { defineConfig } from "vitest/config";
import * as path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      // @raycast/api ships types only, so it cannot be resolved by a test runner.
      "@raycast/api": path.resolve(__dirname, "test/raycast-api.stub.ts"),
    },
  },
});
