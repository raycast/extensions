import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InvalidTargetError, isKillSignal, isValidPid, processExists, sendSignal } from "../src/core/signals";

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
