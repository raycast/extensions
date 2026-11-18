import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The Raycast extension imports `@raycast/api` which is a runtime-only ESM module.
    // We don't need it in unit tests — only the pure logic modules are tested.
  },
});
