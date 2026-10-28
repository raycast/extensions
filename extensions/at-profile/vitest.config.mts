import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const stub = (name: string) => fileURLToPath(new URL(`./test/stubs/${name}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": stub("raycast-api.ts"),
      "@raycast/utils": stub("raycast-utils.ts"),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
