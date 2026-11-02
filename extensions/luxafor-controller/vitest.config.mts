import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { setupFiles: ["./tests/no-network.ts"], include: ["tests/**/*.test.ts"], clearMocks: true },
});
