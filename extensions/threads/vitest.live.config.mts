import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The live suite only. It hits threads.com, so it needs network and will fail if one of
    // the fixture posts is deleted — that is a signal to swap the post, not a code defect.
    include: ["src/**/*.live.test.ts"],
    testTimeout: 60_000,
  },
});
