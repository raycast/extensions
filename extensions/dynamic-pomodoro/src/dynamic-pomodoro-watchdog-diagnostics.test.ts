import assert from "node:assert/strict";
import test from "node:test";
import { applySoundAttemptToDiagnostics, type WatchdogDiagnostics } from "./dynamic-pomodoro-watchdog-diagnostics.ts";

test("applySoundAttemptToDiagnostics writes sound attempt metadata", () => {
  const previous: WatchdogDiagnostics = {
    lastNotifyChannel: "system-notification",
  };

  const next = applySoundAttemptToDiagnostics(previous, {
    attempted: true,
    attemptedAt: 123,
    mode: "always",
    source: "custom",
  });

  assert.equal(next.lastSoundAttemptAt, 123);
  assert.equal(next.lastSoundMode, "always");
  assert.equal(next.lastSoundSource, "custom");
  assert.equal(next.lastSoundError, undefined);
  assert.equal(next.lastNotifyChannel, "system-notification");
});

test("applySoundAttemptToDiagnostics supports mode off with source none", () => {
  const next = applySoundAttemptToDiagnostics({}, {
    attempted: false,
    mode: "off",
    source: "none",
  });

  assert.equal(next.lastSoundAttemptAt, undefined);
  assert.equal(next.lastSoundMode, "off");
  assert.equal(next.lastSoundSource, "none");
  assert.equal(next.lastSoundError, undefined);
});

test("applySoundAttemptToDiagnostics stores sound error text", () => {
  const next = applySoundAttemptToDiagnostics({}, {
    attempted: true,
    attemptedAt: 456,
    mode: "always",
    source: "beep",
    error: "Error: ENOENT",
  });

  assert.equal(next.lastSoundAttemptAt, 456);
  assert.equal(next.lastSoundSource, "beep");
  assert.equal(next.lastSoundError, "Error: ENOENT");
});
