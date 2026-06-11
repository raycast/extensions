import { defineConfig, configDefaults } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@raycast/api", replacement: path.resolve(__dirname, "src/__mocks__/@raycast/api.ts") },
      { find: /^react\/jsx-dev-runtime$/, replacement: path.resolve(__dirname, "src/__mocks__/react-jsx-runtime.ts") },
      { find: /^react\/jsx-runtime$/, replacement: path.resolve(__dirname, "src/__mocks__/react-jsx-runtime.ts") },
      { find: /^react$/, replacement: path.resolve(__dirname, "src/__mocks__/react.ts") },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    includeSource: ["src/**/*.{ts,tsx}"],
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
});
