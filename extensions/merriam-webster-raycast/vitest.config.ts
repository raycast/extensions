import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/**/*.test.ts"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@raycast/api": path.resolve(__dirname, "src/test/__mocks__/raycast-api.ts"),
    },
  },
});
