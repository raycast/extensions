import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": new URL("./src/test/raycast-api-stub.ts", import.meta.url).pathname,
    },
  },
});
