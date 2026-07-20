import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@raycast/api": path.resolve(__dirname, "./__mocks__/@raycast/api.js"),
      "@raycast/utils": path.resolve(__dirname, "./__mocks__/@raycast/utils.js"),
    },
    environment: "node",
  },
});
