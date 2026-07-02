import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    alias: {
      "@raycast/api": path.resolve(__dirname, "src/__mocks__/@raycast/api.ts"),
      "@raycast/utils": path.resolve(__dirname, "src/__mocks__/@raycast/utils.ts"),
    },
  },
});
