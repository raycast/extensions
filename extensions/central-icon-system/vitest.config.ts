import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Extension sources only. The build scripts under `scripts/` are plain ESM
    // tested with node:test, so vitest would find no suite in them.
    include: ["src/**/*.test.ts"],
  },
});
