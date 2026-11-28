import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [{ find: /^swift:.*$/, replacement: fileURLToPath(new URL("./test/stubs/swift.ts", import.meta.url)) }],
  },
  test: { include: ["test/**/*.test.ts"], environment: "node" },
});
