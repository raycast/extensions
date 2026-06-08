import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // `@raycast/api` only resolves inside the Raycast runtime; alias to a stub for tests.
      "@raycast/api": fileURLToPath(new URL("./test/raycast-api-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.tsx", "src/**/index.ts"],
    },
  },
});
