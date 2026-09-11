import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * End-to-end config for the Raycast extension against the local Supabase
 * stack.
 *
 * The specs import the extension's own modules and let them talk to a real
 * backend — no mocking of Supabase, RLS, or the edge functions. Only
 * `@raycast/api`, which exists solely inside the Raycast runtime, is aliased.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": path.resolve(__dirname, "stubs/raycast-api.ts"),
    },
  },
  test: {
    include: ["e2e/specs/**/*.spec.ts"],
    // One at a time: the specs share one local backend and one test account.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
