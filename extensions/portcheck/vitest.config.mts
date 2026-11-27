import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: { provider: "v8", include: ["src/lib/model.ts", "src/lib/portcheck.ts"] },
  },
});
