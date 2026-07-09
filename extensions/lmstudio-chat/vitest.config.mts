import path from "node:path";
import { defineConfig } from "vitest/config";

// @raycast/api ships without a "main"/"exports" field in its package.json —
// it's only resolvable through the `ray` CLI's bundler, not plain Node/Vite
// resolution. Tests mock this module entirely via vi.mock(), but Vitest still
// needs a resolvable path to register the mock against, so alias it to the
// package's actual entry file.
export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": path.resolve(__dirname, "node_modules/@raycast/api/dist/index.js"),
    },
  },
});
