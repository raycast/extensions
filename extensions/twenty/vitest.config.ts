import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const raycastApiMockPath = fileURLToPath(new URL("./src/services/raycast-api.mock.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": raycastApiMockPath,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
