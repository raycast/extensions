import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      // `@raycast/api` ships only types (no runtime entry), so alias it to a
      // stub for tests that import @raycast/api-dependent modules. See
      // tests/stubs/raycast-api.ts.
      "@raycast/api": fileURLToPath(new URL("./tests/stubs/raycast-api.ts", import.meta.url)),
    },
  },
});
