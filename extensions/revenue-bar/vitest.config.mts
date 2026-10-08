import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Date-range tests assert behaviour in a zone with DST. Individual tests switch zones where needed.
    env: { TZ: "America/New_York" },
  },
});
