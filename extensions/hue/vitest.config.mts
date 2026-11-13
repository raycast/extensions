import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@raycast/api": fileURLToPath(new URL("test/raycast-stub.ts", import.meta.url)) } },
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: "test/globalSetup.ts",
    setupFiles: "test/setup.ts",
    mockReset: true,
    restoreMocks: true,
    unstubGlobals: true,
    silent: "passed-only",
    // Inlined, so it imports the aliased @raycast/api.
    server: { deps: { inline: ["@raycast/utils"] } },
  },
});
