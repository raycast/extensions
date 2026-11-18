import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { LaunchFailedError, launchUntilReady } from "../src/launch.ts";

/** The error prefix these launches' reports start with: not the contract's,
 *  so a launch that ignores the one it is handed fails. */
const PREFIX = "Fatal: ";

// In a process of its own, which must exit while the child it launched runs on: Raycast
// unloads a no-view command "after the script finishes"
// (https://developers.raycast.com/information/lifecycle).
test("a launch settles once its child says it is up, and the child outlives the launcher", () => {
  const pidFile = join(mkdtempSync(join(tmpdir(), "launch-")), "pid");
  const child =
    "require('fs').writeFileSync(process.argv[1], String(process.pid));" +
    "process.stdout.write('\\n'); setInterval(() => {}, 1000);";
  const launcher =
    `import { launchUntilReady } from ${JSON.stringify(new URL("../src/launch.ts", import.meta.url).href)};` +
    `await launchUntilReady(process.execPath, ["-e", ${JSON.stringify(child)}, ${JSON.stringify(pidFile)}], ${JSON.stringify(PREFIX)});`;
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", launcher], { timeout: 10_000 });
  const pid = Number(readFileSync(pidFile, "utf8"));
  try {
    assert.equal(run.status, 0, `the launcher did not exit on its own: ${run.signal ?? run.stderr}`);
    assert.doesNotThrow(() => process.kill(pid, 0), "the child must outlive the launcher");
  } finally {
    // A failed run would leave it running.
    try {
      process.kill(pid);
    } catch {
      // Already gone.
    }
  }
});

/** A launch of a child that writes `stderr` and exits 1, settled. */
const failed = (stderr) =>
  launchUntilReady(
    process.execPath,
    ["-e", `process.stderr.write(${JSON.stringify(stderr)}); process.exit(1);`],
    PREFIX,
  ).catch((e) => e);

test("a child that exits before it is up fails the launch with its code and its error report", async () => {
  const e = await failed("⚠ pixtuoid: a notice\nFatal: an old line\nFatal: no adapter\n\nCaused by:\n    0: gone\n");
  assert.ok(e instanceof LaunchFailedError);
  assert.equal(e.code, 1);
  assert.equal(e.message, "Fatal: no adapter\n\nCaused by:\n    0: gone");
});

test("a failed launch's stderr with no error report is its message whole", async () => {
  assert.equal((await failed("  a panic\n")).message, "a panic");
});

test("a binary that cannot be spawned fails the launch", async () => {
  await assert.rejects(launchUntilReady(join(mkdtempSync(join(tmpdir(), "launch-")), "no-such-pixtuoid"), [], PREFIX), {
    code: "ENOENT",
  });
});

test("a child that never says it is up is killed at the deadline", { timeout: 15_000 }, async () => {
  const pidFile = join(mkdtempSync(join(tmpdir(), "launch-")), "pid");
  // It ignores SIGTERM, as a boot stuck on its main thread does.
  const hung =
    "process.on('SIGTERM', () => {}); require('fs').writeFileSync(process.argv[1], String(process.pid));" +
    "setInterval(() => {}, 1000);";
  const deadlineMs = 2_000;
  await assert.rejects(
    launchUntilReady(process.execPath, ["-e", hung, pidFile], PREFIX, deadlineMs),
    /did not open its window/,
  );
  const pid = Number(readFileSync(pidFile, "utf8"));
  const gone = () => {
    try {
      process.kill(pid, 0);
      return false;
    } catch {
      return true;
    }
  };
  for (let waited = 0; !gone() && waited < deadlineMs; waited += 50) {
    await new Promise((settle) => setTimeout(settle, 50));
  }
  assert.ok(gone(), "the hung child outlived its deadline");
});
