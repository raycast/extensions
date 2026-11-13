import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    {
      name: "raycast-test-runtime",
      resolveId(id) {
        if (id === "@raycast/api") return id;
      },
    },
  ],
});
