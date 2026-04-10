import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": path.resolve(__dirname, "src/__mocks__/@raycast/api.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    includeSource: ["src/**/*.{ts,tsx}"],
  },
});
