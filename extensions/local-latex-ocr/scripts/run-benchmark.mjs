import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await mkdir(path.join(root, "work"), { recursive: true });
const build = spawnSync(
  path.join(root, "node_modules", ".bin", "esbuild"),
  [
    path.join(root, "scripts", "benchmark.ts"),
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--external:onnxruntime-node",
    `--outfile=${path.join(root, "work", "benchmark.cjs")}`,
  ],
  { stdio: "inherit" },
);
if (build.status !== 0) process.exit(build.status ?? 1);
const benchmark = spawnSync(
  process.execPath,
  [path.join(root, "work", "benchmark.cjs"), ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(benchmark.status ?? 1);
