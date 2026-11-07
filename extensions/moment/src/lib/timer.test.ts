import assert from "node:assert/strict";
import { test } from "node:test";
import { isSetapp, MOMENT_BUNDLE_IDS, parseReply, parseRunning, type ScriptOutput } from "./timer.ts";

const printed = (stdout: string): ScriptOutput => ({ stdout, stderr: "", exitCode: 0, timedOut: false });

for (const [line, timer] of [
  [
    "ok\tpaused\tfocus\t742\t1500\tfalse",
    { state: "paused", kind: "focus", timeLeftSeconds: 742, durationSeconds: 1500, capped: false },
  ],
  [
    "ok\trunning\tbreak\t300\t300\tfalse",
    { state: "running", kind: "break", timeLeftSeconds: 300, durationSeconds: 300, capped: false },
  ],
  [
    "ok\trunning\tfocus\t5400\t5400\ttrue",
    { state: "running", kind: "focus", timeLeftSeconds: 5400, durationSeconds: 5400, capped: true },
  ],
  [
    "ok\tidle\tnone\t0\t0\tfalse",
    { state: "idle", kind: "none", timeLeftSeconds: 0, durationSeconds: 0, capped: false },
  ],
  [
    "ok\tfinished\tnone\t0\t0\tfalse",
    { state: "finished", kind: "none", timeLeftSeconds: 0, durationSeconds: 0, capped: false },
  ],
] as const) {
  test(`parseReply_okLine${timer.state}${timer.kind}${timer.capped ? "Capped" : ""}_readsTheTimer`, () => {
    assert.deepEqual(parseReply(printed(line)), { type: "timer", timer });
  });
}

test("parseReply_caughtError_readsTheNumberAndKeepsTheMessage", () => {
  assert.deepEqual(parseReply(printed("error\t-1743\tNot authorized to send Apple events to Moment.")), {
    type: "error",
    number: -1743,
    message: "Not authorized to send Apple events to Moment.",
  });
});

test("parseReply_caughtErrorWithATabInItsMessage_keepsTheWholeMessage", () => {
  assert.deepEqual(parseReply(printed("error\t1004\tThe timer\tis already paused.")), {
    type: "error",
    number: 1004,
    message: "The timer\tis already paused.",
  });
});

test("parseReply_startRefusedWithTheTimerRead_readsTheSessionInFlight", () => {
  assert.deepEqual(parseReply(printed("refused\t1006\tpaused\tbreak\t65\t300\tfalse")), {
    type: "refusedInFlight",
    inFlight: { state: "paused", kind: "break", timeLeftSeconds: 65, durationSeconds: 300, capped: false },
  });
});

test("parseReply_startRefusedWithAnUnreadableTimer_isError1006", () => {
  assert.deepEqual(parseReply(printed("refused\t1006\tpaused\tbreak")), { type: "error", number: 1006, message: "" });
});

test("parseReply_uncaughtErrorOnStderr_readsTheTrailingNumber", () => {
  const output = { stdout: "", stderr: "-:6:57: execution error: Something. (-2741)", exitCode: 1, timedOut: false };
  assert.deepEqual(parseReply(output), { type: "error", number: -2741, message: "" });
});

test("parseReply_failedRunWithoutANumber_isUnreadable", () => {
  assert.deepEqual(parseReply({ stdout: "", stderr: "osascript: crashed", exitCode: 1, timedOut: false }), {
    type: "unreadable",
  });
});

test("parseReply_killedWithoutAnExitCode_isUnreadable", () => {
  assert.deepEqual(parseReply({ stdout: "", stderr: "", exitCode: null, timedOut: false }), { type: "unreadable" });
});

test("parseReply_timedOut_isTimedOutWhateverWasPrinted", () => {
  const output = { stdout: "ok\tidle\tnone\t0\t0\tfalse", stderr: "", exitCode: null, timedOut: true };
  assert.deepEqual(parseReply(output), { type: "timedOut" });
});

for (const line of [
  "",
  "ok",
  "ok\tpaused\tfocus\t742\t1500",
  "ok\tpaused\tfocus\t742\t1500\tfalse\textra",
  "ok\tasleep\tfocus\t742\t1500\tfalse",
  "ok\tpaused\tnap\t742\t1500\tfalse",
  "ok\tpaused\tfocus\t7.5\t1500\tfalse",
  "ok\tpaused\tfocus\t\t1500\tfalse",
  "ok\tpaused\tfocus\t-1\t1500\tfalse",
  "ok\tpaused\tfocus\t742\t1500\tyes",
  "OK\tpaused\tfocus\t742\t1500\tfalse",
  "error\tabc\tA message.",
  "refused\t1005\tpaused\tfocus\t742\t1500\tfalse",
]) {
  test(`parseReply_${JSON.stringify(line)}_isUnreadable`, () => {
    assert.deepEqual(parseReply(printed(line)), { type: "unreadable" });
  });
}

// Which Moment: the App Store's and Setapp's builds (FF-1309), and the running check's answer.

const APP_STORE = "studio.lumi.moment";
const SETAPP = "studio.lumi.moment-setapp";

test("MOMENT_BUNDLE_IDS_bothMacApps_areTheAppStoresThenSetapps", () => {
  assert.deepEqual(MOMENT_BUNDLE_IDS, [APP_STORE, SETAPP]);
});

// FF-1318: where a Moment too old for Raycast is updated.
test("isSetapp_theAppStoresMoment_isFalse", () => {
  assert.equal(isSetapp(APP_STORE), false);
});

test("isSetapp_setappsMoment_isTrue", () => {
  assert.equal(isSetapp(SETAPP), true);
});

test("parseRunning_twoPrinted_isBothInTheirOrder", () => {
  assert.deepEqual(parseRunning(printed(`${APP_STORE}\t${SETAPP}`)), [APP_STORE, SETAPP]);
});

test("parseRunning_onePrinted_isThatOne", () => {
  assert.deepEqual(parseRunning(printed(SETAPP)), [SETAPP]);
});

test("parseRunning_nothingPrinted_isNone", () => {
  assert.deepEqual(parseRunning(printed("")), []);
});

test("parseRunning_aFailedRun_throwsSoTheCallerLogsIt", () => {
  const output = { stdout: "", stderr: "-:1:2: execution error: Something. (-2741)", exitCode: 1, timedOut: false };
  assert.throws(() => parseRunning(output), /-2741/);
});

test("parseRunning_timedOut_throwsSoTheCallerLogsIt", () => {
  assert.throws(() => parseRunning({ stdout: "", stderr: "", exitCode: null, timedOut: true }), /timed out/);
});
