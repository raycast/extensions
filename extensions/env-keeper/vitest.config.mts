import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // 真实模块在 Raycast 进程外导入会炸;测试里换成本地桩(见 test/stubs/raycast-api.ts)
      "@raycast/api": fileURLToPath(new URL("./test/stubs/raycast-api.ts", import.meta.url)),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
