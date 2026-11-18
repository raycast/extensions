import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // The lib modules import Raycast runtime APIs (LocalStorage, environment,
      // Icon, …) that only exist inside Raycast. Tests swap in a small mock.
      "@raycast/api": resolve(__dirname, "tests/mocks/raycast-api.ts"),
    },
  },
});
