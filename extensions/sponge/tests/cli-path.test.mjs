import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { findReadingLibraryCli } from "../src/cli-path.ts";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "raycast-sponge-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return async (directory, script) => {
    const bin = join(root, directory);
    await mkdir(bin);
    const cli = join(bin, "sponge");
    await writeFile(cli, "#!/bin/sh\n" + script, { mode: 0o755 });
    return cli;
  };
}

test("skips a stdin filter named sponge and uses the reading-library CLI later in the search", async (t) => {
  const executable = await fixture(t);
  const filter = await executable("moreutils", 'echo "$#" >> "$0.calls"\ncat\n');
  const reading = await executable("npm", "printf 'sponge — a local article library\\n\\nQuick start:\\n'");
  assert.equal(await findReadingLibraryCli([filter, filter, reading]), reading);
  // One probe, zero arguments, and an empty stdin. No filenames or library commands reached the filter.
  assert.equal(await readFile(filter + ".calls", "utf8"), "0\n");
});

test("rejects a wrong explicit path and a failed or version-only executable", async (t) => {
  const executable = await fixture(t);
  const version = await executable("version", "echo 1.2.3");
  const failed = await executable("broken", "echo 'sponge — a local article library'\nexit 1");
  assert.equal(await findReadingLibraryCli([version]), undefined);
  assert.equal(await findReadingLibraryCli([version, failed]), undefined);
});

test("a stalled candidate times out and an aborted search stops probing", async (t) => {
  const executable = await fixture(t);
  const stalled = await executable("stalled", "exec sleep 15");
  const reading = await executable("reading", "echo 'sponge — a local article library'");
  assert.equal(await findReadingLibraryCli([stalled, reading]), reading);
  await assert.rejects(findReadingLibraryCli([stalled, reading], AbortSignal.timeout(50)), { name: "AbortError" });
});
