import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": fileURLToPath(new URL("./test/raycastApiStub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/__test__/*.test.ts"],
  },
});
