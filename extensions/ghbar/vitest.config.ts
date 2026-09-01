import { defineConfig } from "vitest/config";

// Cekirdek (src/core) hicbir Raycast API'si import etmiyor; bu yuzden
// testler Raycast calistirilmadan, dogrudan Node'da kosuyor.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
