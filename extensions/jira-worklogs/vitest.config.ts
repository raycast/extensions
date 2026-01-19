import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    server: {
      deps: {
        inline: [/@raycast\/api/],
      },
    },
  },
  resolve: {
    alias: {
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
      "@/__mocks__": path.resolve(__dirname, "./src/__mocks__"),
      "@raycast/api": path.resolve(__dirname, "./src/__mocks__/@raycast/api.ts"),
    },
  },
});
