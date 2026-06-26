import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // `@raycast/api` has no entry point resolvable outside the Raycast
      // runtime; point tests at a local stub. Test-only — `ray build` uses its
      // own bundler config and is unaffected.
      "@raycast/api": fileURLToPath(new URL("./test/raycast-api.stub.ts", import.meta.url)),
    },
  },
});
