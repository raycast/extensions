import assert from "node:assert/strict";
import { test } from "node:test";
import { NOT_INSTALLED, type Failure } from "./lines.ts";
import {
  askWith,
  chooseBundleId,
  runCommandWith,
  runToolWith,
  type Ask,
  type CommandFeedback,
  type Outcome,
} from "./run.ts";
import { argumentsFor, scriptFor } from "./scripts.ts";
import type { Command, Reply, TimerInfo } from "./timer.ts";

const capped: TimerInfo = {
  state: "running",
  kind: "focus",
  timeLeftSeconds: 5400,
  durationSeconds: 5400,
  capped: true,
};

/** A fake Moment: answers every ask with `outcome`, and remembers what it was asked. */
function fakeAsk(outcome: Outcome = { ok: true, timer: capped }) {
  const calls: [Command, number | undefined][] = [];
  const ask: Ask = async (command, minutes) => {
    calls.push([command, minutes]);
    return outcome;
  };
  return { ask, calls };
}

/** A fake Raycast window: records what the person would see. */
function fakeFeedback() {
  const shown: string[] = [];
  const feedback: CommandFeedback = {
    waiting: async (title) => {
      shown.push(`waiting: ${title}`);
      return (failure: Failure) => shown.push(`waiting → failure: ${failure.title}`);
    },
    hud: async (line) => {
      shown.push(`hud: ${line}`);
    },
    failure: async (failure) => {
      shown.push(`failure: ${failure.title}`);
    },
  };
  return { feedback, shown };
}

// Tools: what Raycast AI receives.

test("runToolWith_aCappedTimer_handsRaycastAIOnlyTheFourFields", async () => {
  const { ask } = fakeAsk();
  assert.deepEqual(await runToolWith(ask, "addTime", 60), {
    state: "running",
    kind: "focus",
    timeLeftSeconds: 5400,
    durationSeconds: 5400,
  });
});

for (const minutes of [0, 91, 45.5, "abc"]) {
  test(`runToolWith_minutes${JSON.stringify(minutes)}_isRefusedWithoutAskingMoment`, async () => {
    const { ask, calls } = fakeAsk();
    await assert.rejects(runToolWith(ask, "startFocus", minutes));
    assert.deepEqual(calls, []);
  });
}

test("runToolWith_wholeMinutes_areAskedAsANumber", async () => {
  const { ask, calls } = fakeAsk();
  await runToolWith(ask, "startFocus", "25");
  assert.deepEqual(calls, [["startFocus", 25]]);
});

test("runToolWith_aRefusal_throwsTheToastsLines", async () => {
  const { ask } = fakeAsk({ ok: false, failure: NOT_INSTALLED });
  await assert.rejects(runToolWith(ask, "checkTimer"), {
    message: "Moment isn't installed on this Mac. Moment is on the Mac App Store.",
  });
});

// Commands: what the person sees.

for (const minutesText of ["0", "91", "abc", "4.5"]) {
  test(`runCommandWith_minutes${JSON.stringify(minutesText)}_isRefusedBeforeMomentIsAsked`, async () => {
    const { ask, calls } = fakeAsk();
    const { feedback, shown } = fakeFeedback();
    await runCommandWith(ask, feedback, "startFocus", minutesText);
    assert.deepEqual(calls, []);
    assert.equal(shown.length, 1);
    assert.match(shown[0], /^failure: /);
  });
}

test("runCommandWith_noMinutes_asksMomentWithoutThem", async () => {
  const { ask, calls } = fakeAsk();
  await runCommandWith(ask, fakeFeedback().feedback, "addTime", "");
  assert.deepEqual(calls, [["addTime", undefined]]);
});

test("runCommandWith_success_waitsThenShowsSirisLineInAHUD", async () => {
  const { ask } = fakeAsk({
    ok: true,
    timer: { ...capped, capped: false, timeLeftSeconds: 2700, durationSeconds: 2700 },
  });
  const { feedback, shown } = fakeFeedback();
  await runCommandWith(ask, feedback, "startFocus", "45");
  assert.deepEqual(shown, ["waiting: Waiting for Moment…", "hud: Starting 45 minute focus session"]);
});

test("runCommandWith_failure_turnsTheWaitingToastIntoTheFailure", async () => {
  const { ask } = fakeAsk({ ok: false, failure: { title: "The timer is already paused." } });
  const { feedback, shown } = fakeFeedback();
  await runCommandWith(ask, feedback, "pauseTimer");
  assert.deepEqual(shown, ["waiting: Waiting for Moment…", "waiting → failure: The timer is already paused."]);
});

// Choosing the Moment: the App Store's and Setapp's builds (FF-1309).

const APP_STORE = "studio.lumi.moment";
const SETAPP = "studio.lumi.moment-setapp";

/**
 * A fake Mac: the bundle ids getApplications lists, in its order, and the
 * running check's answer (or its failure). Remembers each running check and
 * each log line.
 */
function fakeMac(installed: string[], running: string[] | Error = []) {
  const checks: string[][] = [];
  const logged: string[] = [];
  const effects = {
    installedBundleIds: async () => installed,
    runningBundleIds: async (bundleIds: string[]) => {
      checks.push(bundleIds);
      if (running instanceof Error) throw running;
      return running;
    },
    log: (message: string) => {
      logged.push(message);
    },
  };
  return { effects, checks, logged };
}

const OTHER_APPS = ["com.apple.finder", "com.raycast.macos"];
const CHOSEN: Record<string, string> = { [APP_STORE]: "TheAppStores", [SETAPP]: "Setapps" };

for (const [situation, installed, running, chosen] of [
  ["neitherInstalled", OTHER_APPS, [], undefined],
  ["appStoreAlone", [...OTHER_APPS, APP_STORE], [], APP_STORE],
  ["setappAlone", [SETAPP, ...OTHER_APPS], [], SETAPP],
  ["bothNoneRunning", [APP_STORE, SETAPP], [], APP_STORE],
  ["bothSetappRunning", [APP_STORE, SETAPP], [SETAPP], SETAPP],
  ["bothAppStoreRunning", [APP_STORE, SETAPP], [APP_STORE], APP_STORE],
  ["bothRunning", [APP_STORE, SETAPP], [SETAPP, APP_STORE], APP_STORE],
  ["bothSetappListedFirst", [SETAPP, ...OTHER_APPS, APP_STORE], [], APP_STORE],
  [
    "setappListedTwiceAmongLookalikes",
    [SETAPP, "studio.lumi.moment.Widgets", "studio.lumi.momentous", SETAPP],
    [],
    SETAPP,
  ],
  ["bothRunningCheckNamesOthers", [APP_STORE, SETAPP], ["com.apple.finder", "studio.lumi.moment.Widgets"], APP_STORE],
] as const) {
  test(`chooseBundleId_${situation}_is${chosen === undefined ? "None" : CHOSEN[chosen]}`, async () => {
    const { effects } = fakeMac([...installed], [...running]);
    assert.equal(await chooseBundleId(effects), chosen);
  });
}

for (const installed of [OTHER_APPS, [APP_STORE], [SETAPP], [SETAPP, SETAPP]]) {
  test(`chooseBundleId_${JSON.stringify(installed)}_neverChecksWhatIsRunning`, async () => {
    const { effects, checks } = fakeMac(installed);
    await chooseBundleId(effects);
    assert.deepEqual(checks, []);
  });
}

test("chooseBundleId_bothInstalled_checksJustTheTwoInTheAppStoreFirstOrder", async () => {
  const { effects, checks } = fakeMac([SETAPP, ...OTHER_APPS, APP_STORE, SETAPP]);
  await chooseBundleId(effects);
  assert.deepEqual(checks, [[APP_STORE, SETAPP]]);
});

test("chooseBundleId_aRunningCheckThatThrows_isTheAppStoresWithoutThrowing", async () => {
  const { effects } = fakeMac([APP_STORE, SETAPP], new Error("spawn osascript ENOENT"));
  assert.equal(await chooseBundleId(effects), APP_STORE);
});

test("chooseBundleId_aRunningCheckThatThrows_isLogged", async () => {
  const { effects, logged } = fakeMac([APP_STORE, SETAPP], new Error("spawn osascript ENOENT"));
  await chooseBundleId(effects);
  assert.equal(logged.length, 1);
  assert.match(logged[0], /spawn osascript ENOENT/);
});

// Asking Moment: the installed check, then one script.

function fakeScript(reply: Reply | Error) {
  const runs: [string, string[]][] = [];
  const runScript = async (script: string, args: string[]) => {
    runs.push([script, args]);
    if (reply instanceof Error) throw reply;
    return reply;
  };
  return { runScript, runs };
}

test("askWith_neitherInstalled_isNotInstalledAndRunsNoScript", async () => {
  const { runScript, runs } = fakeScript({ type: "timer", timer: capped });
  const { effects, checks } = fakeMac(OTHER_APPS);
  const outcome = await askWith({ ...effects, runScript }, "pauseTimer", undefined);
  assert.deepEqual(outcome, { ok: false, failure: NOT_INSTALLED });
  assert.deepEqual([runs, checks], [[], []]);
});

test("askWith_appStoreInstalled_runsTheCommandsScriptWithItsBundleIdFirst", async () => {
  const { runScript, runs } = fakeScript({ type: "timer", timer: capped });
  const outcome = await askWith({ ...fakeMac([APP_STORE]).effects, runScript }, "addTime", 10);
  assert.deepEqual(outcome, { ok: true, timer: capped });
  assert.deepEqual(runs, [[scriptFor("addTime"), argumentsFor(APP_STORE, 10)]]);
});

test("askWith_setappAlone_sendsSetappsBundleIdAsArgvsFirstItem", async () => {
  const { runScript, runs } = fakeScript({ type: "timer", timer: capped });
  await askWith({ ...fakeMac([SETAPP]).effects, runScript }, "startFocus", 25);
  assert.deepEqual(runs, [[scriptFor("startFocus"), [SETAPP, "25"]]]);
});

test("askWith_bothWithSetappRunning_asksTheSetappMoment", async () => {
  const { runScript, runs } = fakeScript({ type: "timer", timer: capped });
  await askWith({ ...fakeMac([APP_STORE, SETAPP], [SETAPP]).effects, runScript }, "checkTimer", undefined);
  assert.deepEqual(runs, [[scriptFor("checkTimer"), [SETAPP]]]);
});

test("askWith_bothWithARunningCheckThatThrows_asksTheAppStoreMoment", async () => {
  const { runScript, runs } = fakeScript({ type: "timer", timer: capped });
  const { effects } = fakeMac([APP_STORE, SETAPP], new Error("osascript timed out"));
  const outcome = await askWith({ ...effects, runScript }, "stopTimer", undefined);
  assert.deepEqual(outcome, { ok: true, timer: capped });
  assert.deepEqual(runs, [[scriptFor("stopTimer"), [APP_STORE]]]);
});

test("askWith_anErrorReply_isItsFailure", async () => {
  const { runScript } = fakeScript({ type: "error", number: 1004, message: "" });
  const outcome = await askWith({ ...fakeMac([APP_STORE]).effects, runScript }, "pauseTimer", undefined);
  assert.deepEqual(outcome, { ok: false, failure: { title: "The timer is already paused." } });
});

test("askWith_aScriptThatThrows_isCouldNotComplete", async () => {
  const { runScript } = fakeScript(new Error("spawn osascript ENOENT"));
  const outcome = await askWith({ ...fakeMac([APP_STORE]).effects, runScript }, "stopTimer", undefined);
  assert.deepEqual(outcome, { ok: false, failure: { title: "Moment couldn't complete the command." } });
});

test("askWith_anInstalledCheckThatThrows_isCouldNotComplete", async () => {
  const { runScript, runs } = fakeScript({ type: "timer", timer: capped });
  const installedBundleIds = async (): Promise<string[]> => {
    throw new Error("Launch Services");
  };
  const outcome = await askWith({ ...fakeMac([]).effects, installedBundleIds, runScript }, "checkTimer", undefined);
  assert.deepEqual(outcome, { ok: false, failure: { title: "Moment couldn't complete the command." } });
  assert.deepEqual(runs, []);
});

// The update line (FF-1318): a Moment from before the dictionary answers
// -1708, and the line names whatever updates the Moment that was asked.

const TOO_OLD = "This version of Moment doesn't support Raycast.";

/** This fake Mac's chosen Moment, answering every script with -1708. */
function tooOldAsk(installed: string[], running: string[] = []): Ask {
  const { runScript } = fakeScript({ type: "error", number: -1708, message: "" });
  return (command, minutes) => askWith({ ...fakeMac(installed, running).effects, runScript }, command, minutes);
}

/** A Raycast window that keeps each failure whole: its title, message and action. */
function failuresShown() {
  const failures: Failure[] = [];
  const feedback: CommandFeedback = {
    waiting: async () => (failure: Failure) => failures.push(failure),
    hud: async () => {},
    failure: async (failure) => {
      failures.push(failure);
    },
  };
  return { feedback, failures };
}

const APP_STORE_UPDATE: Failure = {
  title: TOO_OLD,
  message: "Update Moment from the App Store.",
  action: "openAppStore",
};
const SETAPP_UPDATE: Failure = { title: TOO_OLD, message: "Update Moment in Setapp." };

for (const [situation, installed, running, failure, toolError] of [
  ["appStoreAlone", [APP_STORE], [], APP_STORE_UPDATE, `${TOO_OLD} Update Moment from the App Store.`],
  ["setappAlone", [SETAPP], [], SETAPP_UPDATE, `${TOO_OLD} Update Moment in Setapp.`],
  ["bothSetappRunning", [APP_STORE, SETAPP], [SETAPP], SETAPP_UPDATE, `${TOO_OLD} Update Moment in Setapp.`],
] as const) {
  test(`askWith_${situation}TooOld_saysToUpdateTheMomentAsked`, async () => {
    const outcome = await tooOldAsk([...installed], [...running])("pauseTimer", undefined);
    assert.deepEqual(outcome, { ok: false, failure });
  });

  test(`runCommandWith_${situation}TooOld_turnsTheWaitingToastIntoItsUpdateLine`, async () => {
    const { feedback, failures } = failuresShown();
    await runCommandWith(tooOldAsk([...installed], [...running]), feedback, "startFocus", "25");
    assert.deepEqual(failures, [failure]);
  });

  test(`runToolWith_${situation}TooOld_throwsItsUpdateLine`, async () => {
    await assert.rejects(runToolWith(tooOldAsk([...installed], [...running]), "checkTimer"), { message: toolError });
  });
}
