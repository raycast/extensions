import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAddEntryArgs,
  buildBreakArgs,
  buildCreateBlockArgs,
  buildStartArgs,
  buildStatusArgs,
  buildStopArgs,
} from "../src/lib/command-builders";

test("builds every supported start form", () => {
  assert.deepEqual(buildStartArgs({ blockName: "Deep Work", mode: "unlocked" }), ["-start", "Deep Work"]);
  assert.deepEqual(buildStartArgs({ blockName: "Deep Work", mode: "as-is" }), ["-start", "Deep Work", "-as-is"]);
  assert.deepEqual(buildStartArgs({ blockName: "Deep Work", mode: "timed", minutes: 90 }), [
    "-start",
    "Deep Work",
    "-lock",
    "90",
  ]);
  assert.deepEqual(
    buildStartArgs({
      blockName: "Deep Work",
      mode: "password",
      password: "two words 'quoted'",
    }),
    ["-start", "Deep Work", "-password", "two words 'quoted'"],
  );
  assert.deepEqual(
    buildStartArgs({
      blockName: "Deep Work",
      mode: "random-text",
      randomTextLength: 120,
    }),
    ["-start", "Deep Work", "-random-text", "120"],
  );
});

test("builds stop, status, and add-entry forms", () => {
  assert.deepEqual(buildStopArgs("Deep Work"), ["-stop", "Deep Work"]);
  assert.deepEqual(buildStopArgs("Deep Work", "focus 123"), ["-stop", "Deep Work", "-password", "focus 123"]);
  assert.deepEqual(buildStatusArgs("Deep Work"), ["-status", "Deep Work"]);
  assert.deepEqual(buildAddEntryArgs("Deep Work", "website", "youtube.com"), [
    "-add",
    "Deep Work",
    "-web",
    "youtube.com",
  ]);
  assert.deepEqual(buildAddEntryArgs("Deep Work", "exception", "docs.example.com"), [
    "-add",
    "Deep Work",
    "-exception",
    "docs.example.com",
  ]);
});

test("builds website and device block creation forms", () => {
  assert.deepEqual(buildCreateBlockArgs("Deep Work", "website-app"), ["-add-block", "Deep Work"]);
  assert.deepEqual(buildCreateBlockArgs("Bedtime", "device-lock"), ["-add-device-block", "Bedtime"]);
  assert.deepEqual(buildCreateBlockArgs("Bedtime", "device-sign-out"), ["-add-device-block", "Bedtime", "-sign-out"]);
  assert.deepEqual(buildCreateBlockArgs("Bedtime", "device-shut-down"), ["-add-device-block", "Bedtime", "-shut-down"]);
});

test("builds break control forms", () => {
  assert.deepEqual(buildBreakArgs("Deep Work", "start-delay"), ["-start-delay-break", "Deep Work"]);
  assert.deepEqual(buildBreakArgs("Deep Work", "stop-delay"), ["-stop-delay-break", "Deep Work"]);
  assert.deepEqual(buildBreakArgs("Deep Work", "stop-random-text"), ["-stop-random-text-break", "Deep Work"]);
});

test("rejects invalid numeric and null password parameters", () => {
  assert.throws(() => buildStartArgs({ blockName: "Deep Work", mode: "timed", minutes: 0 }), /at least 1/);
  assert.throws(
    () =>
      buildStartArgs({
        blockName: "Deep Work",
        mode: "random-text",
        randomTextLength: 1000,
      }),
    /between 1 and 999/,
  );
  assert.throws(
    () =>
      buildStartArgs({
        blockName: "Deep Work",
        mode: "password",
        password: "bad\0password",
      }),
    /null/,
  );
});
