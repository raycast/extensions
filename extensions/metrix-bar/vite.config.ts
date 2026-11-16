import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: { options: { typeAware: true, typeCheck: true } },
  fmt: { printWidth: 120 },
  test: { include: ["test/**/*.test.ts"] },
});
