import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const stub = (name: string) => fileURLToPath(new URL(`./src/test/${name}.ts`, import.meta.url));

export default defineConfig({
  resolve: { alias: { "@raycast/api": stub("raycast-api"), "@raycast/utils": stub("raycast-utils") } },
});
