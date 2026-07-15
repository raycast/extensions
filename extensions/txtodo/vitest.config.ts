import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": resolve(__dirname, "src/__mocks__/@raycast/api.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    coverage: {
      reporter: ["text", "html"],
      include: ["src/domain/**", "src/io/**"],
    },
  },
});
