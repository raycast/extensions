import { fileURLToPath } from "node:url";

// Raycast supplies its API at runtime; it has no Node.js entry point.
export default {
  resolve: {
    alias: {
      "@raycast/api": fileURLToPath(new URL("./tests/raycast-api.ts", import.meta.url)),
    },
  },
};
