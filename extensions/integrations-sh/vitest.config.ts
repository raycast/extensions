import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@raycast/api": resolve(__dirname, "src/test-utils/raycast.tsx") } },
  test: { server: { deps: { inline: ["@raycast/utils"] } } },
});
