import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@raycast/api": resolve(__dirname, "src/__mocks__/raycast-api.ts"),
    },
  },
});
