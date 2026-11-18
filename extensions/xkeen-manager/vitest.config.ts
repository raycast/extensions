import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      exclude: ["src/lib/__tests__/**", "src/lib/ssh.ts", "src/lib/files.ts", "src/lib/health.ts"],
      reporter: ["text", "html"],
    },
  },
});
