import { defineConfig } from "vitest/config";
import { resolve } from "path";

// `@raycast/api` is injected by the Raycast runtime at build time and has no
// resolvable entry point on disk, so Vite can't even load it to be mocked.
// Alias it to a local stub; tests that need specific behaviour from it use
// vi.mock on top of this.
export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": resolve(__dirname, "test/raycast-api-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
