import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Extension sources only. `*.live.test.ts` is excluded here because it hits
    // threads.com — run it deliberately with `npm run test:live`.
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.live.test.ts", "node_modules/**"],
  },
});
