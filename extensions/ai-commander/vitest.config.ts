import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests run in plain Node. `@raycast/api` only works inside Raycast, so the
// few modules that touch it receive a small stand-in.
export default defineConfig({
  resolve: {
    alias: { "@raycast/api": path.resolve(__dirname, "tests/support/raycast-api.ts") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
  },
});
