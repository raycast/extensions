import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // 测试不加载真正的 Raycast 运行时：被测模块顶层 import 了 @raycast/api，用桩替代。
      "@raycast/api": path.resolve(__dirname, "test/mocks/raycast-api.ts"),
      // 源码用 @/* 别名（与 tsconfig paths 一致）；vitest 需同样解析，否则被测模块里的 @/ 引用加载不到。
      "@": path.resolve(__dirname, "src"),
    },
  },
});
