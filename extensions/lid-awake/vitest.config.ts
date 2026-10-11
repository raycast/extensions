import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Integration tests change real sleep and sudoers settings, so they run only through `npm run test:integration`.
    exclude: ["test/integration/**", "node_modules/**"],
    environment: "node",
  },
});
