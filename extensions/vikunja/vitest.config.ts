import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    alias: {
      // The real @raycast/api has no entry point resolvable outside the Raycast
      // runtime, so unit tests resolve it to a minimal stub instead.
      "@raycast/api": path.resolve(
        process.cwd(),
        "test/raycast-api-stub.ts",
      ),
    },
  },
});
