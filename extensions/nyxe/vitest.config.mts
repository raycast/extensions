import { defineConfig } from "vitest/config";

// Pure modules only (src/lib): nothing here imports @raycast/api, which only
// runs inside Raycast.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
