import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      // UI entry points and thin Raycast wrappers are exercised manually inside
      // Raycast, not by unit tests. Everything else must stay covered.
      exclude: [
        "src/**/*.tsx",
        "src/commands/**",
        "src/components/**",
        "src/hooks/**",
        "src/types/**",
        // Thin Raycast API adapters and command entry files. These contain no
        // branching logic — they wire the tested core to Raycast — and are
        // verified manually inside Raycast. See docs/TESTING.md.
        "src/preferences/preferences.ts",
        "src/preferences/roots-store.ts",
        "src/refresh-index.ts",
        "src/search-repositories.tsx",
      ],
    },
  },
});
