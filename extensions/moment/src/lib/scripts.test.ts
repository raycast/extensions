import assert from "node:assert/strict";
import { test } from "node:test";
import {
  APPLE_EVENT_TIMEOUT_SECONDS,
  argumentsFor,
  EVENT_CODES,
  FOLLOW_UP_TIMEOUT_SECONDS,
  RECORD_PROPERTY_CODES,
  RUNNING_CHECK_TIMEOUT_MILLISECONDS,
  RUNNING_SCRIPT,
  SCRIPT_TIMEOUT_MILLISECONDS,
  scriptFor,
  takesMinutes,
} from "./scripts.ts";
import { COMMANDS, MOMENT_BUNDLE_IDS } from "./timer.ts";

const EVENT = /«event (Mmnt\w{4})»/g;

for (const command of COMMANDS) {
  const script = scriptFor(command);

  test(`scriptFor_${command}_sendsItsOwnEventFirst`, () => {
    const events = [...script.matchAll(EVENT)].map((match) => match[1]);
    assert.equal(events[0], EVENT_CODES[command]);
    const others = events.filter((code) => code !== EVENT_CODES[command]);
    assert.deepEqual(others, command === "startFocus" ? ["MmntChck"] : []);
  });

  test(`scriptFor_${command}_namesNoTermOfMomentsDictionary`, () => {
    for (const term of [
      "start focus",
      "pause timer",
      "resume timer",
      "add time",
      "stop timer",
      "check timer",
      "timer info",
      "time left",
    ]) {
      assert.ok(!script.includes(term), term);
    }
  });

  test(`scriptFor_${command}_takesMomentFromArgvNeverALiteral`, () => {
    for (const bundleId of MOMENT_BUNDLE_IDS) assert.ok(!script.includes(bundleId), bundleId);
    assert.ok(!/application (id )?"/.test(script));
    assert.ok(script.includes("set moment to item 1 of argv"));
    assert.ok(script.includes("tell application id moment"));
  });

  test(`scriptFor_${command}_readsMinutesFromArgvOnlyWhenItTakesThem`, () => {
    assert.equal(script.includes("item 2 of argv"), takesMinutes(command));
  });

  test(`scriptFor_${command}_catchesEveryErrorByNumber`, () => {
    assert.ok(script.includes("on error msg number n"));
    assert.ok(script.includes(`return "error" & tab & n & tab & msg`));
  });

  test(`scriptFor_${command}_waitsForMomentWithAnAppleEventTimeout`, () => {
    assert.ok(script.includes(`with timeout of ${APPLE_EVENT_TIMEOUT_SECONDS} seconds`));
  });

  test(`scriptFor_${command}_readsTheRecordInFieldOrder`, () => {
    const fields = RECORD_PROPERTY_CODES.map((code) => `(«class ${code}» of r)`).join(" & tab & ");
    assert.ok(script.includes(`return head & tab & ${fields}`));
  });
}

test("scriptFor_startFocus_readsTheTimerOnlyAfterRefusal1006", () => {
  const script = scriptFor("startFocus");
  const refusal = script.indexOf("if n is 1006 then");
  assert.ok(refusal > 0);
  assert.ok(script.indexOf("«event MmntChck»") > refusal);
  assert.ok(script.includes(`return my replyLine("refused" & tab & n, r)`));
});

test("takesMinutes_onlyStartFocusAndAddTime", () => {
  assert.deepEqual(
    COMMANDS.filter((command) => takesMinutes(command)),
    ["startFocus", "addTime"],
  );
});

test("timeouts_bothAppleEventWaitsEndBeforeTheProcessIsKilled", () => {
  assert.ok((APPLE_EVENT_TIMEOUT_SECONDS + FOLLOW_UP_TIMEOUT_SECONDS) * 1000 < SCRIPT_TIMEOUT_MILLISECONDS);
});

test("timeouts_coverMomentsFiveSecondLaunchWaitWithRoom", () => {
  assert.ok(APPLE_EVENT_TIMEOUT_SECONDS >= 15);
});

test("argumentsFor_noMinutes_isTheBundleIdAlone", () => {
  assert.deepEqual(argumentsFor("studio.lumi.moment", undefined), ["studio.lumi.moment"]);
});

test("argumentsFor_minutes_followTheBundleIdAsText", () => {
  assert.deepEqual(argumentsFor("studio.lumi.moment-setapp", 45), ["studio.lumi.moment-setapp", "45"]);
});

for (const command of COMMANDS) {
  test(`scriptFor_${command}_sendsOnlyOneLineTellsSoNothingElseRunsInsideMoment`, () => {
    const lines = scriptFor(command)
      .split("\n")
      .map((line) => line.trim());
    const tells = lines.filter((line) => line.startsWith("tell "));
    assert.ok(tells.length > 0);
    for (const line of tells)
      assert.match(line, /^tell application id moment to set r to «event Mmnt\w{4}»( wholeMinutes)?$/);
    assert.ok(!lines.includes("end tell"));
  });
}

for (const command of ["startFocus", "addTime"] as const) {
  test(`scriptFor_${command}_readsTheMinutesOutsideTheTellThenSendsThem`, () => {
    const lines = scriptFor(command)
      .split("\n")
      .map((line) => line.trim());
    const read = lines.indexOf("set wholeMinutes to (item 2 of argv) as integer");
    const send = lines.indexOf(`tell application id moment to set r to «event ${EVENT_CODES[command]}» wholeMinutes`);
    assert.ok(read >= 0 && send > read, `read ${read}, send ${send}`);
  });
}

// The running check, asked only when both Moments are installed: which of them is running.

const runningLines = RUNNING_SCRIPT.split("\n").map((line) => line.trim());

test("runningScript_takesTheBundleIdsFromArgvNeverALiteral", () => {
  for (const bundleId of MOMENT_BUNDLE_IDS) assert.ok(!RUNNING_SCRIPT.includes(bundleId), bundleId);
  assert.ok(!/application (id )?"/.test(RUNNING_SCRIPT));
  assert.ok(runningLines.includes("repeat with candidate in argv"));
});

test("runningScript_asksEachAppOnlyWhetherItIsRunning_soNoneLaunchesOrAsksForAutomation", () => {
  assert.ok(RUNNING_SCRIPT.includes("(application id bundleId) is running"));
  assert.doesNotMatch(RUNNING_SCRIPT, /\btell\b|System Events/);
});

test("runningScript_checksEachBundleIdInItsOwnTry_soOneNotInstalledCountsAsNotRunning", () => {
  const order = [
    "repeat with candidate in argv",
    "try",
    "if (application id bundleId) is running then set end of runningIds to bundleId",
    "end try",
    "end repeat",
  ].map((line) => runningLines.indexOf(line));
  assert.ok(
    order.every((index, position) => index >= 0 && (position === 0 || index > order[position - 1])),
    String(order),
  );
});

test("runningScript_printsTheRunningBundleIdsTabSeparated", () => {
  const delimiters = runningLines.indexOf("set AppleScript's text item delimiters to tab");
  assert.ok(delimiters >= 0 && runningLines.indexOf("return runningIds as text") > delimiters);
});

test("timeouts_aStuckRunningCheckDelaysACommandByFiveSecondsAtMost", () => {
  assert.ok(RUNNING_CHECK_TIMEOUT_MILLISECONDS <= 5_000);
});
