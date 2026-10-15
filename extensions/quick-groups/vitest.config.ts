import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": fileURLToPath(new URL("./tests/raycast-api-mock.ts", import.meta.url)),
      "@raycast/utils": fileURLToPath(new URL("./tests/raycast-utils-mock.ts", import.meta.url)),
    },
  },
});
