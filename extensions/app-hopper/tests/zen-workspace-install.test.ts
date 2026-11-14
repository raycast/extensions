import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

test("Zen workspace installer preserves existing AutoConfig and removes only owned files", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "zen-bridge-"));
  const run = (action: string) =>
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/zen-workspace-bridge.ts", action, "--resources", directory],
      {
        stdio: "pipe",
      },
    );
  try {
    await mkdir(path.join(directory, "defaults/pref"), { recursive: true });
    const other = path.join(directory, "defaults/pref/custom.js");
    await writeFile(other, 'pref("general.config.filename", "custom.cfg");');
    assert.throws(() => run("install"));
    assert.equal(await readFile(other, "utf8"), 'pref("general.config.filename", "custom.cfg");');
    await rm(other);
    run("install");
    assert.match(await readFile(path.join(directory, "app-hopper-zen.cfg"), "utf8"), /allStoredTabs/);
    run("install");
    run("remove");
    await assert.rejects(readFile(path.join(directory, "app-hopper-zen.cfg")), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
