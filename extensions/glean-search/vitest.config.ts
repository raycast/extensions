import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": resolve(__dirname, "__mocks__/@raycast/api.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
