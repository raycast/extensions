// Copied from badge-count-raycast test/run-helper.test.ts on 2026-09-30, unchanged except this header and import paths
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runHelper } from "../../src/lib/badge/run-helper.ts";
import { interpretHelperRun } from "../../src/lib/badge/helper-output.ts";

let dir = "";

before(() => {
  dir = mkdtempSync(join(tmpdir(), "dock-badges-test-"));
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

function fake(name: string, body: string, mode = 0o755): string {
  const path = join(dir, name);
  writeFileSync(path, body);
  chmodSync(path, mode);
  return path;
}

const VALID_JSON =
  '{"trusted":true,"apps":[{"bundleId":"com.apple.mail","path":"/System/Applications/Mail.app","title":"Mail","running":true,"badge":"5"}]}';

describe("runHelper with fake helpers", () => {
  it("exit 10 becomes permission", async () => {
    const run = await runHelper(fake("exit10", "#!/bin/sh\nexit 10\n"));
    assert.equal(run.exitCode, 10);
    const read = interpretHelperRun(run);
    assert.equal(read.ok, false);
    if (!read.ok) assert.equal(read.failure, "permission");
  });

  it("exit 11 becomes dock-not-running", async () => {
    const read = interpretHelperRun(await runHelper(fake("exit11", "#!/bin/sh\nexit 11\n")));
    assert.equal(read.ok, false);
    if (!read.ok) assert.equal(read.failure, "dock-not-running");
  });

  it("exit 12 becomes dock-unrecognised", async () => {
    const read = interpretHelperRun(await runHelper(fake("exit12", "#!/bin/sh\nexit 12\n")));
    assert.equal(read.ok, false);
    if (!read.ok) assert.equal(read.failure, "dock-unrecognised");
  });

  it("valid JSON with exit 0 is ok with badge 5", async () => {
    const run = await runHelper(fake("valid", `#!/bin/sh\nprintf '%s' '${VALID_JSON}'\nexit 0\n`));
    assert.equal(run.exitCode, 0);
    assert.equal(run.repairedMode, false);
    const read = interpretHelperRun(run);
    assert.equal(read.ok, true);
    if (read.ok) {
      assert.equal(read.apps.length, 1);
      assert.equal(read.apps[0].bundleId, "com.apple.mail");
      assert.equal(read.apps[0].badge, "5");
    }
  });

  it("garbage with exit 0 becomes dock-unrecognised", async () => {
    const read = interpretHelperRun(await runHelper(fake("garbage", "#!/bin/sh\necho garbage\nexit 0\n")));
    assert.equal(read.ok, false);
    if (!read.ok) assert.equal(read.failure, "dock-unrecognised");
  });

  it("a hanging helper times out and is killed promptly", async () => {
    const run = await runHelper(fake("sleeper", "#!/bin/sh\nsleep 5\n"), 300);
    assert.equal(run.timedOut, true);
    assert.ok(run.elapsedMs < 2000, `elapsedMs was ${run.elapsedMs}`);
    const read = interpretHelperRun(run);
    assert.equal(read.ok, false);
    if (!read.ok) assert.equal(read.failure, "timeout");
  });

  it("F5: a missing helper becomes helper-missing", async () => {
    const run = await runHelper(join(dir, "does-not-exist"));
    assert.equal(run.spawnErrorCode, "ENOENT");
    const read = interpretHelperRun(run);
    assert.equal(read.ok, false);
    if (!read.ok) {
      assert.equal(read.failure, "helper-missing");
      assert.equal(read.reason, "Helper not found");
    }
  });

  it("repairs a missing executable bit and runs the helper", async () => {
    const path = fake("no-exec", `#!/bin/sh\nprintf '%s' '${VALID_JSON}'\n`, 0o644);
    assert.equal(statSync(path).mode & 0o100, 0);
    const run = await runHelper(path);
    assert.equal(run.repairedMode, true);
    const read = interpretHelperRun(run);
    assert.equal(read.ok, true);
    assert.notEqual(statSync(path).mode & 0o100, 0);
  });

  it("a directory as helper path fails without throwing", async () => {
    const sub = join(dir, "a-directory");
    mkdirSync(sub);
    const run = await runHelper(sub);
    const read = interpretHelperRun(run);
    assert.equal(read.ok, false);
  });
});
