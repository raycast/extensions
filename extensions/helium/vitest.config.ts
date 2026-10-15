import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

export default defineConfig({
  resolve: {
    alias: {
      // `@raycast/api` has no runtime entry point (Raycast injects it at build
      // time), so it cannot be imported under Vitest. See tests/mocks.
      "@raycast/api": fileURLToPath(new URL("./tests/mocks/raycast-api.ts", import.meta.url)),
    },
  },
});
