import { defineConfig } from "vitest/config";

// Live tests against the real Keito API. Run with `npm run test:live`, which loads .env.local.
export default defineConfig({
  test: {
    include: ["src/**/*.live.ts"],
    testTimeout: 60000,
    fileParallelism: false,
  },
});
