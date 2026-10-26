import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const directory = await mkdtemp(join(tmpdir(), "cliproxy-tests-"));
try {
  const outfile = join(directory, "usage.cjs");
  await build({ entryPoints: ["tests/usage.test.ts"], outfile, bundle: true, platform: "node", format: "cjs" });
  const result = spawnSync(process.execPath, ["--test", outfile], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally { await rm(directory, { recursive: true, force: true }); }
