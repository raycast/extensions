import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    alias: {
      // Stub Raycast API imports so tests don't fail on import
      "@raycast/api": path.resolve(__dirname, "src/lib/__tests__/__mocks__/raycast-api.ts"),
    },
  },
});
