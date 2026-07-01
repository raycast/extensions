import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true, // Allows use of 'vi' without importing it
    environment: "node",
    alias: [
      {
        find: "@raycast/utils",
        replacement: path.resolve(__dirname, "test/__mocks__/raycast.utils.ts"),
      },
    ],
  },
});
