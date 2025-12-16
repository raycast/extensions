import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/__mocks__/**",
        "**/tests/**",
        "**/*.spec.ts",
        "**/*.test.ts",
        "**/tools/**", // Exclude AI tools (for now, todo: add back when they get more complex)
        "**/components/**", // Exclude React components
        "**/*.tsx", // Exclude all TSX files (React components)
        "**/*.config.*",
        "**/constants.tsx",
      ],
      include: ["src/**/*.ts"], // Only include .ts files in src
    },
  },
  resolve: {
    alias: {
      "@raycast/api": path.resolve(__dirname, "./src/__mocks__/@raycast/api.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
