import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const stubPath = fileURLToPath(new URL("./src/test/raycast-api-stub.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": stubPath,
    },
  },
  test: {
    environment: "node",
  },
});
