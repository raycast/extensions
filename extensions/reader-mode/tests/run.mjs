/**
 * Test runner.
 *
 * Bundles the suite with esbuild (already part of the Raycast toolchain) so that TypeScript
 * and the extension's own import graph resolve exactly as they do in a real build, then
 * hands the bundle to Node's test runner.
 *
 * `@raycast/api` is aliased to a stub: the logic under test — fetch, clean, parse, detect —
 * has no business talking to the host, and this keeps the suite runnable from a terminal.
 */

import { build } from "esbuild";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// The fixture corpus is real captured HTML and is deliberately not committed. Without it the
// suite still runs, but every test that checks behaviour against an actual paywalled page
// quietly skips — and a green run would then be claiming coverage it does not have. Say so.
const fixtureDir = join(root, ".github", ".private", "tests");
if (!existsSync(fixtureDir)) {
  console.warn(
    `\n⚠  No fixture corpus at ${fixtureDir}\n` +
      `   Tests against real captured pages will be SKIPPED. A green run does not mean\n` +
      `   paywall detection or article extraction works on real sites.\n`,
  );
}

const workDir = await mkdtemp(join(tmpdir(), "reader-tests-"));
const bundle = join(workDir, "suite.mjs");

try {
  await build({
    entryPoints: [join(here, "reader.test.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: bundle,
    absWorkingDir: root,
    logLevel: "error",
    alias: { "@raycast/api": join(here, "raycast-api-stub.ts") },
  });

  const child = spawn(process.execPath, ["--expose-gc", "--test", bundle], {
    stdio: "inherit",
    cwd: root,
  });

  const code = await new Promise((resolve) => child.on("exit", resolve));
  process.exitCode = code ?? 1;
} finally {
  await rm(workDir, { recursive: true, force: true });
}
