import { plugin } from "bun";
import path from "path";

// stub @raycast/api so search-spotlight.tsx can be loaded outside Raycast
plugin({
  name: "raycast-api-stub",
  setup(build) {
    build.onResolve({ filter: /^@raycast\/api$/ }, () => ({
      path: path.resolve(__dirname, "raycast-api-stub.ts"),
    }));
  },
});
