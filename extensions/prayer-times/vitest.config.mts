import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Raycast resolves `swift:` imports at build time; tests get a stub.
    alias: [{ find: /^swift:.*$/, replacement: fileURLToPath(new URL("./test/swift-stub.ts", import.meta.url)) }],
  },
});
