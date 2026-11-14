import path from "node:path";
import { defineConfig } from "vitest/config";

const src = path.resolve(__dirname, "src");

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": path.resolve(__dirname, "tests/__mocks__/@raycast/api.ts"),
      "@commands": path.resolve(src, "commands"),
      "@components": path.resolve(src, "components"),
      "@hooks": path.resolve(src, "hooks"),
      "@lib": path.resolve(src, "lib"),
      "@type": path.resolve(src, "types"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
    },
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: [".direnv/**"],
    setupFiles: ["./tests/setup.ts"],
  },
});
