import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@raycast/api": fileURLToPath(new URL("./test/mocks/raycast-api.ts", import.meta.url)),
      "@raycast/utils": fileURLToPath(new URL("./test/mocks/raycast-utils.ts", import.meta.url)),
    },
  },
});
