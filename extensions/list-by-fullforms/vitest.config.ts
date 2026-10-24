import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests cover the pure, hand-ported lib/ logic (icon/visibility
// resolution, image-callout rewriting, tag parsing, type labels,
// platform-aware shortcut hints). Some of those modules import
// @raycast/api for its Icon / Image / Color values, which don't load
// outside the Raycast runtime, so the alias below points those imports
// at a tiny stub (test/mocks/raycast-api.ts). Tests live outside src/
// so `ray build` / `ray lint` (scoped to src/) never see them.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@raycast/api": fileURLToPath(
        new URL("./test/mocks/raycast-api.ts", import.meta.url),
      ),
    },
  },
});
