import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    alias: {
      "@raycast/api": path.resolve(__dirname, "src/__tests__/raycast-mock.ts"),
    },
  },
});
