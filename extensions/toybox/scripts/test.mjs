// 测试运行器：用 esbuild 把 *.test.ts 打包（桩掉 Raycast / React 运行时），
// 再交给 Node 内置的 `node:test` 执行。无需引入额外测试框架依赖。
import { build } from "esbuild";
import { mkdirSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const stub = join(here, "raycast-stub.cjs");
const cacheDir = join(root, ".test-cache");
mkdirSync(cacheDir, { recursive: true });

const testDir = join(root, "src", "__tests__");
const files = readdirSync(testDir).filter((f) => f.endsWith(".test.ts") || f.endsWith(".test.tsx"));

if (files.length === 0) {
  console.log("没有发现测试文件");
  process.exit(0);
}

let failed = 0;
for (const f of files) {
  const entry = join(testDir, f);
  const out = join(cacheDir, f.replace(/\.tsx?$/, ".mjs"));
  await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    alias: { react: stub, "react/jsx-runtime": stub, "@raycast/api": stub },
    outfile: out,
    logLevel: "warning",
  });
  console.log(`▶ ${f}`);
  const res = spawnSync(process.execPath, ["--test", out], { stdio: "inherit", cwd: root });
  if (res.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
