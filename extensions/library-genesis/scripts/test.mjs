import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = await mkdtemp(join(tmpdir(), "library-genesis-tests-"));
try {
  const testFiles = ["tests/api.test.ts", "tests/downloads.test.ts", "tests/ui-updates.test.ts"];
  await build({
    entryPoints: testFiles,
    outdir: directory,
    outExtension: { ".js": ".cjs" },
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
  });
  const outputs = testFiles.map((file) => join(directory, file.split("/").at(-1).replace(/\.ts$/, ".cjs")));
  const result = spawnSync(process.execPath, ["--test", ...outputs], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
