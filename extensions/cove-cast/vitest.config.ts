import { defineConfig } from "vitest/config";

// Unit tests cover the pure logic modules (cove.ts, detect.ts). The Raycast
// view (buy.tsx) imports @raycast/api and is exercised via `ray build`, so it
// is intentionally excluded here.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
});
