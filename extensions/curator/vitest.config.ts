import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
    coverage: { include: ["src/lib/**/*.ts"], exclude: ["src/lib/cache.ts", "src/lib/actions.ts", "src/lib/llm.ts"] },
  },
});
