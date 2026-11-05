import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACTIONS,
  failureFor,
  lengthLabel,
  NOT_INSTALLED,
  spokenDuration,
  startConfirmation,
  successLine,
  timeLeftLine,
  WAITING_FOR_MOMENT,
} from "./lines.ts";
import { COMMANDS, type TimerInfo } from "./timer.ts";

// Foundation's English for VoiceTimerDialog.spokenDuration, pinned by a Swift
// probe of `.units(allowed:width: .wide)` (FF-1281 research §7).
for (const [seconds, words] of [
  [0, "0 seconds"],
  [0.4, "1 second"],
  [1, "1 second"],
  [40, "40 seconds"],
  [59.2, "1 minute"],
  [60, "1 minute"],
  [119, "1 minute"],
  [742, "12 minutes"],
  [3600, "1 hour"],
  [3660, "1 hour, 1 minute"],
  [5400, "1 hour, 30 minutes"],
  [7200, "2 hours"],
  [-5, "0 seconds"],
  [Number.NaN, "0 seconds"],
] as const) {
  test(`spokenDuration_${seconds}s_is${words.replace(/\W/g, "")}`, () => {
    assert.equal(spokenDuration(seconds), words);
  });
}

const runningFocus: TimerInfo = {
  state: "running",
  kind: "focus",
  timeLeftSeconds: 742,
  durationSeconds: 1500,
  capped: false,
};
const pausedFocus: TimerInfo = { ...runningFocus, state: "paused" };
const runningBreak: TimerInfo = {
  state: "running",
  kind: "break",
  timeLeftSeconds: 40,
  durationSeconds: 300,
  capped: false,
};
const pausedBreak: TimerInfo = { ...runningBreak, state: "paused" };
const idle: TimerInfo = { state: "idle", kind: "none", timeLeftSeconds: 0, durationSeconds: 0, capped: false };
const finished: TimerInfo = { ...idle, state: "finished" };

for (const [timer, line] of [
  [runningFocus, "12 minutes left in this focus session."],
  [pausedFocus, "This focus session is paused, with 12 minutes left."],
  [runningBreak, "40 seconds left in this break."],
  [pausedBreak, "This break is paused, with 40 seconds left."],
] as const) {
  test(`timeLeftLine_${timer.state}${timer.kind}_isSirisLine`, () => {
    assert.equal(timeLeftLine(timer), line);
  });
}

test("successLine_startFocus_namesTheMinutesAsSiriDoes", () => {
  const started: TimerInfo = { ...runningFocus, timeLeftSeconds: 2700, durationSeconds: 2700 };
  assert.equal(successLine("startFocus", started), "Starting 45 minute focus session");
});

for (const [command, line] of [
  ["pauseTimer", "Timer paused"],
  ["resumeTimer", "Timer resumed"],
  ["stopTimer", "Timer stopped"],
] as const) {
  test(`successLine_${command}_isSirisLine`, () => {
    assert.equal(successLine(command, command === "stopTimer" ? idle : runningFocus), line);
  });
}

test("successLine_addTime_isTheTimeLeft", () => {
  assert.equal(successLine("addTime", runningFocus), "12 minutes left in this focus session.");
});

test("successLine_addTimeToAPausedBreak_isThePausedBreaksTimeLeft", () => {
  assert.equal(successLine("addTime", pausedBreak), "This break is paused, with 40 seconds left.");
});

test("successLine_addTimeCapped_saysTheMaximumFirst", () => {
  const capped: TimerInfo = { ...runningFocus, timeLeftSeconds: 5400, durationSeconds: 5400, capped: true };
  assert.equal(
    successLine("addTime", capped),
    "The timer can run for 90 minutes at most. 1 hour, 30 minutes left in this focus session.",
  );
});

for (const timer of [runningFocus, pausedFocus, runningBreak, pausedBreak]) {
  test(`successLine_checkTimer${timer.state}${timer.kind}_isTheTimeLeft`, () => {
    assert.equal(successLine("checkTimer", timer), timeLeftLine(timer));
  });
}

test("successLine_checkTimerIdle_isSirisNothingRunning", () => {
  assert.equal(successLine("checkTimer", idle), "No timer is currently running");
});

test("successLine_checkTimerFinished_isSirisAlreadyFinished", () => {
  assert.equal(successLine("checkTimer", finished), "The timer has already finished.");
});

const error = (number: number, message = "") => ({ type: "error", number, message }) as const;

for (const [inFlight, title] of [
  [runningFocus, "A focus session is already running, with 12 minutes left."],
  [pausedFocus, "A focus session is paused, with 12 minutes left."],
  [runningBreak, "A break is already running, with 40 seconds left."],
  [pausedBreak, "A break is paused, with 40 seconds left."],
] as const) {
  test(`failureFor_startRefused${inFlight.state}${inFlight.kind}_namesTheSessionInFlight`, () => {
    assert.deepEqual(failureFor("startFocus", { type: "refusedInFlight", inFlight }), { title });
  });
}

test("failureFor_startRefusedWithoutTheTimerRead_saysSomethingIsInProgress", () => {
  assert.deepEqual(failureFor("startFocus", error(1006)), {
    title: "A focus session or break is already in progress.",
  });
});

for (const command of COMMANDS) {
  test(`failureFor_${command}NotReady_isSirisLine`, () => {
    assert.deepEqual(failureFor(command, error(1001)), {
      title: "Moment is not ready yet. Please open the app first.",
    });
  });
}

for (const command of ["pauseTimer", "addTime", "stopTimer"] as const) {
  test(`failureFor_${command}WithNothingInFlight_isSirisNothingRunning`, () => {
    assert.deepEqual(failureFor(command, error(1002)), { title: "No timer is currently running" });
  });
}

test("failureFor_resumeWithNothingInFlight_isSirisNothingPaused", () => {
  assert.deepEqual(failureFor("resumeTimer", error(1002)), { title: "No timer is paused" });
});

for (const [number, title] of [
  [1003, "The timer has already finished."],
  [1004, "The timer is already paused."],
  [1005, "The timer is already running."],
  [1007, "The focus session didn't start."],
  [-1700, "Moment takes whole minutes from 1 to 90."],
] as const) {
  test(`failureFor_${number}_is${title.replace(/\W/g, "")}`, () => {
    assert.deepEqual(failureFor("pauseTimer", error(number)), { title });
  });
}

test("failureFor_eventNotHandled_saysToUpdateMomentWithTheAppStore", () => {
  assert.deepEqual(failureFor("pauseTimer", error(-1708)), {
    title: "This version of Moment doesn't support Raycast.",
    message: "Update Moment from the App Store.",
    action: "openAppStore",
  });
});

test("failureFor_automationRefused_saysWhereToAllowIt", () => {
  assert.deepEqual(failureFor("checkTimer", error(-1743)), {
    title: "Raycast isn't allowed to control Moment.",
    message: "Allow it in System Settings › Privacy & Security › Automation › Raycast › Moment.",
    action: "openAutomationSettings",
  });
});

test("failureFor_appleEventTimeoutAndProcessTimeout_areTheSameLine", () => {
  assert.deepEqual(failureFor("startFocus", error(-1712)), { title: "Moment didn't answer in time." });
  assert.deepEqual(failureFor("startFocus", { type: "timedOut" }), { title: "Moment didn't answer in time." });
});

test("failureFor_applicationNotFound_isNotInstalled", () => {
  assert.deepEqual(failureFor("stopTimer", error(-10814)), NOT_INSTALLED);
});

test("notInstalled_linksToTheAppStore", () => {
  assert.deepEqual(NOT_INSTALLED, {
    title: "Moment isn't installed on this Mac.",
    message: "Moment is on the Mac App Store.",
    action: "openAppStore",
  });
});

for (const reply of [error(-10000), error(-600), error(-2741), error(42), { type: "unreadable" } as const]) {
  test(`failureFor_${JSON.stringify(reply)}_isCouldNotComplete`, () => {
    assert.deepEqual(failureFor("addTime", reply), { title: "Moment couldn't complete the command." });
  });
}

test("failureFor_aNumberWithAnyMessage_isTheSameFailure", () => {
  assert.deepEqual(
    failureFor("pauseTimer", error(1004, "The timer is already paused.")),
    failureFor("pauseTimer", error(1004, "Le minuteur est déjà en pause.")),
  );
});

test("actions_openAppStore_isMomentsListing", () => {
  assert.deepEqual(ACTIONS.openAppStore, {
    title: "Open App Store",
    url: "https://apps.apple.com/app/moment-focus-timer/id6446064063",
  });
});

test("actions_openAutomationSettings_isPrivacyAutomation", () => {
  assert.deepEqual(ACTIONS.openAutomationSettings, {
    title: "Open System Settings",
    url: "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
  });
});

test("waitingForMoment_isTheAnimatedToastsLine", () => {
  assert.equal(WAITING_FOR_MOMENT, "Waiting for Moment…");
});

for (const [minutes, label] of [
  [undefined, "The timer's length"],
  [1, "1 minute"],
  [45, "45 minutes"],
] as const) {
  test(`lengthLabel_${String(minutes)}_is${label.replace(/\W/g, "")}`, () => {
    assert.equal(lengthLabel(minutes), label);
  });
}

for (const [minutes, length] of [
  [undefined, "The timer's length"],
  [1, "1 minute"],
  [45, "45 minutes"],
  ["25", "25 minutes"],
] as const) {
  test(`startConfirmation_${JSON.stringify(minutes)}_asksWithTheLengthThatWillBeAsked`, () => {
    assert.deepEqual(startConfirmation(minutes), {
      message: "Start a focus session in Moment?",
      info: [{ name: "Length", value: length }],
    });
  });
}

for (const minutes of [0, 91, 120, 45.5, "abc"]) {
  test(`startConfirmation_${JSON.stringify(minutes)}_isSkippedSoTheToolRefusesAtOnce`, () => {
    assert.equal(startConfirmation(minutes), undefined);
  });
}
