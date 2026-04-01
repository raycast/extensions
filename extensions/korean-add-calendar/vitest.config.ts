import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const raycastApiStub = fileURLToPath(new URL("./tests/stubs/raycast-api.ts", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@raycast/api": raycastApiStub,
    },
  },
});
