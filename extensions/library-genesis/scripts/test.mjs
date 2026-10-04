import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = await mkdtemp(join(tmpdir(), "library-genesis-tests-"));
try {
  const output = join(directory, "api.test.cjs");
  await build({
    entryPoints: ["tests/api.test.ts"],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
  });
  const result = spawnSync(process.execPath, ["--test", output], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
