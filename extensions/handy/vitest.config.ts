import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@raycast/api": resolve(__dirname, "tests/__mocks__/@raycast/api.ts"),
    },
  },
});
