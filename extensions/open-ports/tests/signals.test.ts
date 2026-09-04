import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { describe, it } from "node:test";
import { promisify } from "node:util";
import { fetchStartTime } from "../src/core/ps";
import {
  InvalidTargetError,
  buildGuardedKill,
  isKillSignal,
  isValidPid,
  processExists,
  sendSignal,
} from "../src/core/signals";

const execFileAsync = promisify(execFile);

describe("isValidPid", () => {
  it("accepts only positive safe integers", () => {
    assert.equal(isValidPid(1), true);
    assert.equal(isValidPid(99999), true);

    assert.equal(isValidPid(0), false);
    assert.equal(isValidPid(-1), false);
    assert.equal(isValidPid(1.5), false);
    assert.equal(isValidPid(Number.NaN), false);
    assert.equal(isValidPid(Number.MAX_SAFE_INTEGER + 1), false);
    assert.equal(isValidPid("1"), false);
    assert.equal(isValidPid(undefined), false);
  });
});

describe("sendSignal", () => {
  // kill(0) signals the caller's whole process group and kill(-1) signals every process the
  // user owns. Both must be impossible to reach, whatever the caller passes.
  it("refuses PID 0, which would signal our own process group", async () => {
    await assert.rejects(() => sendSignal(0, "SIGKILL"), InvalidTargetError);
  });

  it("refuses negative PIDs, which would signal process groups or everything", async () => {
    await assert.rejects(() => sendSignal(-1, "SIGKILL"), InvalidTargetError);
    await assert.rejects(() => sendSignal(-4242, "SIGTERM"), InvalidTargetError);
  });

  it("refuses signals the extension does not offer", async () => {
    await assert.rejects(() => sendSignal(4242, "SIGSTOP" as never), InvalidTargetError);
    await assert.rejects(() => sendSignal(4242, undefined as never), InvalidTargetError);
  });
});

describe("isKillSignal", () => {
  it("allows exactly the three offered signals", () => {
    assert.equal(isKillSignal("SIGTERM"), true);
    assert.equal(isKillSignal("SIGINT"), true);
    assert.equal(isKillSignal("SIGKILL"), true);

    assert.equal(isKillSignal("SIGSTOP"), false);
    assert.equal(isKillSignal("9"), false);
    assert.equal(isKillSignal(""), false);
    assert.equal(isKillSignal(undefined), false);
  });
});

describe("processExists", () => {
  it("is true for this process and false for invalid PIDs", () => {
    assert.equal(processExists(process.pid), true);
    assert.equal(processExists(0), false);
    assert.equal(processExists(-1), false);
  });
});

describe("buildGuardedKill", () => {
  // Signal 0 runs the existence and permission check without delivering anything, so the
  // generated script can be executed for real against this very process.
  const CHECK_ONLY = 0;

  it("signals when the PID still holds the same process", async () => {
    const started = await fetchStartTime(process.pid);
    assert.ok(started);

    const script = buildGuardedKill(process.pid, CHECK_ONLY, started);
    const { stdout } = await execFileAsync("/bin/sh", ["-c", `${script} && echo signalled`]);

    assert.match(stdout, /signalled/);
  });

  // This is the window the macOS authentication dialog opens: the PID may have been handed
  // to a different process by the time the password is typed.
  it("refuses to signal when the start time no longer matches", async () => {
    const script = buildGuardedKill(process.pid, CHECK_ONLY, "Mon Jan 1 00:00:00 1970");

    await assert.rejects(
      () => execFileAsync("/bin/sh", ["-c", `${script} && echo signalled`]),
      // execFile surfaces a non-zero exit status as a numeric `code`.
      (error: unknown) => (error as { code?: unknown }).code === 87,
    );
  });

  it("cannot be extended through the expected start time", async () => {
    const marker = `/tmp/open-ports-guard-${process.pid}`;
    rmSync(marker, { force: true });

    const script = buildGuardedKill(process.pid, CHECK_ONLY, `x'; touch ${marker}; echo '`);
    await execFileAsync("/bin/sh", ["-c", script]).catch(() => undefined);

    assert.equal(existsSync(marker), false, "the quoted value must not be able to run a command");
  });
});
