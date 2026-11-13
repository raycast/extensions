import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const stub = (name: string) => fileURLToPath(new URL(`./test/stubs/${name}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: "@raycast/api", replacement: stub("raycast-api.ts") },
      { find: "@raycast/utils", replacement: stub("raycast-utils.ts") },
      { find: "@chrismessina/raycast-logger", replacement: stub("raycast-logger.ts") },
      // Exactly the root: its subpaths are pure and load as they are
      { find: /^@chrismessina\/raycast-kit$/, replacement: stub("raycast-kit.ts") },
    ],
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
