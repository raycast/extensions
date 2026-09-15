import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * `@raycast/api` has no resolvable entry outside the Raycast runtime, so any
 * module that transitively imports it — including pure helpers like
 * `utils/brew/helpers.ts` — cannot be unit tested without a stand-in.
 */
const extensionRoot = fileURLToPath(new URL(".", import.meta.url));

// The @raycast/api stub reads this extension's manifest for its declared
// preference defaults. Hand it the root explicitly: resolving from the working
// directory breaks when vitest is invoked from anywhere but this folder.
process.env.RAYCAST_EXTENSION_ROOT = extensionRoot;

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": fileURLToPath(new URL("./src/utils/__mocks__/raycast-api.ts", import.meta.url)),
    },
  },
});
