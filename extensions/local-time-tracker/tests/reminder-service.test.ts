import assert from "node:assert/strict";
import { createRequire, registerHooks } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("reminder service integrates with Stop Work, storage and notification retries", async () => {
  const directory = await mkdtemp(join(tmpdir(), "local-time-tracker-service-"));
  const items = new Map<string, string | number>();
  const launched: {
    name: string;
    type: string;
    context?: { pomodoroIntervalId?: string; timeAlertTitles?: string[] };
  }[] = [];
  const timeLaunches = () => launched.filter((launch) => launch.context?.timeAlertTitles?.length);
  const pomodoroLaunches = () => launched.filter((launch) => launch.context?.pomodoroIntervalId);
  let failDelivery = false;
  let failRefresh = false;
  let onRefresh: (() => Promise<void>) | undefined;
  let beforeWrite: ((key: string) => Promise<void>) | undefined;
  const preferences = {
    pomodoroEnabled: true,
    timerAlertEnabled: true,
    timerAlertMinutes: "1",
  };
  const api = {
    environment: { supportPath: directory, launchType: "userInitiated" },
    getPreferenceValues: () => preferences,
    LocalStorage: {
      async getItem(key: string) {
        return items.get(key);
      },
      async setItem(key: string, value: string | number) {
        await beforeWrite?.(key);
        items.set(key, value);
      },
      async removeItem(key: string) {
        items.delete(key);
      },
      async allItems() {
        return Object.fromEntries(items);
      },
    },
    LaunchType: { Background: "background", UserInitiated: "userInitiated" },
    async launchCommand(options: (typeof launched)[number]) {
      if (options.name === "menu-bar") {
        if (failRefresh) throw new Error("menu bar refresh failed");
        await onRefresh?.();
      }
      if (options.context && failDelivery) throw new Error("notification failed");
      launched.push(options);
    },
  };
  const globals = globalThis as typeof globalThis & { reminderTestAPI?: typeof api };
  globals.reminderTestAPI = api;
  const mockUrl = new URL("raycast-api-mock.cjs", `file://${directory}/`).href;
  await writeFile(join(directory, "raycast-api-mock.cjs"), "module.exports = globalThis.reminderTestAPI;");
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      return specifier === "@raycast/api" ? { url: mockUrl, shortCircuit: true } : nextResolve(specifier, context);
    },
  });
  try {
    const loadModule = createRequire(join(process.cwd(), "tests/reminder-service.test.ts"));
    const { startTimer, stopTimer } = loadModule("../src/lib/timer.ts") as typeof import("../src/lib/timer");
    const { getActiveTimer, getWorkLogs, saveActiveTimer } = loadModule(
      "../src/lib/storage.ts",
    ) as typeof import("../src/lib/storage");
    const { startPomodoroInterval, getPomodoro, checkReminders, endPomodoro } = loadModule(
      "../src/lib/reminder-service.ts",
    ) as typeof import("../src/lib/reminder-service");

    const timer = await startTimer("project", "Task");
    const pomodoro = await startPomodoroInterval(timer.id);
    assert.equal((await getPomodoro(timer))?.intervalId, pomodoro.intervalId);
    // The new section toggle cancels only the overlay, never the work timer.
    preferences.pomodoroEnabled = false;
    await checkReminders(timer, new Date());
    assert.equal(await getPomodoro(timer), null);
    assert.equal((await getActiveTimer())?.id, timer.id);
    await assert.rejects(startPomodoroInterval(timer.id), /Enable Pomodoro/);
    preferences.pomodoroEnabled = true;
    const restartedPomodoro = await startPomodoroInterval(timer.id);
    assert.notEqual(restartedPomodoro.intervalId, pomodoro.intervalId);
    assert.equal((await startPomodoroInterval(timer.id)).intervalId, restartedPomodoro.intervalId);
    await assert.rejects(startPomodoroInterval(timer.id, restartedPomodoro.intervalId), /has not finished/);

    // Overlay cancellation leaves the regular timer running.
    await endPomodoro(timer.id);
    assert.equal(await getPomodoro(timer), null);
    assert.equal((await getActiveTimer())?.id, timer.id);
    await startPomodoroInterval(timer.id);

    // Stop Work both writes the work log and removes the overlay state.
    assert.equal((await stopTimer()).status, "stopped");
    assert.equal(await getActiveTimer(), null);
    assert.equal(await getPomodoro(timer), null);
    assert.equal((await getWorkLogs()).length, 1);
    await assert.rejects(startPomodoroInterval(timer.id), /no longer running/);

    const current = await startTimer("project", "More work");
    const past = { ...current, startedAt: new Date(Date.now() - 120000).toISOString() };
    await saveActiveTimer(past);
    failDelivery = true;
    await assert.rejects(checkReminders(past, new Date()), /notification failed/);
    failDelivery = false;
    assert.deepEqual(await checkReminders(past, new Date()), { timerReached: true });
    assert.equal(timeLaunches().length, 1);
    assert.match(timeLaunches()[0].context!.timeAlertTitles!.join(" · "), /Work timer reached 1 minutes/);
    await checkReminders(past, new Date());
    assert.equal(timeLaunches().length, 1);
    preferences.timerAlertMinutes = "999";
    assert.deepEqual(await checkReminders(past, new Date()), { timerReached: true });

    // Background refresh launches the same persistent foreground alert, with retry and deduplication.
    items.delete(`reminderNotified:timer:${past.id}`);
    preferences.timerAlertMinutes = "1";
    api.environment.launchType = "background";
    failDelivery = true;
    await assert.rejects(checkReminders(past, new Date()), /notification failed/);
    assert.equal(items.has(`reminderNotified:timer:${past.id}`), false);
    failDelivery = false;
    await checkReminders(past, new Date());
    assert.equal(timeLaunches().length, 2);
    assert.match(timeLaunches()[1].context!.timeAlertTitles!.join(" · "), /Work timer reached 1 minutes/);
    await checkReminders(past, new Date());
    assert.equal(timeLaunches().length, 2);
    api.environment.launchType = "userInitiated";
    preferences.timerAlertMinutes = "999";

    // A clock rollback leaves both the regular timer and overlay intact.
    const preserved = await startPomodoroInterval(past.id);
    await saveActiveTimer({ ...past, startedAt: new Date(Date.now() + 60000).toISOString() });
    assert.equal((await stopTimer()).status, "clock-rollback");
    assert.equal((await getPomodoro(past))?.intervalId, preserved.intervalId);

    // Finished intervals open a persistent foreground view, retry failed launches,
    // and never automatically start another interval or send a Toast.
    await saveActiveTimer(past);
    const dueAt = new Date(preserved.endsAt);
    failDelivery = true;
    await assert.rejects(checkReminders(past, dueAt), /notification failed/);
    assert.equal(pomodoroLaunches().length, 0);
    failDelivery = false;
    await checkReminders(past, dueAt);
    assert.deepEqual(pomodoroLaunches(), [
      { name: "start-work", type: "userInitiated", context: { pomodoroIntervalId: preserved.intervalId } },
    ]);
    assert.equal(timeLaunches().length, 2);
    await checkReminders(past, new Date(dueAt.getTime() + 60000));
    assert.equal(pomodoroLaunches().length, 1);
    assert.equal((await getPomodoro(past))?.intervalId, preserved.intervalId);

    // A time alert and Pomodoro completion share one window and independent IDs.
    items.delete(`reminderNotified:timer:${past.id}`);
    items.delete(`reminderNotified:pomodoro:${preserved.intervalId}`);
    preferences.timerAlertMinutes = "1";
    const beforeCombined = launched.length;
    await checkReminders(past, dueAt);
    assert.equal(launched.length, beforeCombined + 1);
    assert.equal(launched.at(-1)?.context?.pomodoroIntervalId, preserved.intervalId);
    assert.match(launched.at(-1)?.context?.timeAlertTitles?.[0] ?? "", /Work timer reached/);
    await checkReminders(past, dueAt);
    assert.equal(launched.length, beforeCombined + 1);

    // Damaged overlay data is preserved and reported, but cannot block either time alert.
    items.delete(`reminderNotified:timer:${past.id}`);
    items.set("pomodoroState", "broken-json");
    preferences.timerAlertMinutes = "1";
    await assert.rejects(checkReminders(past, dueAt), /Saved pomodoro data is invalid/);
    assert.equal(items.get(`reminderNotified:timer:${past.id}`), "true");
    assert.equal(items.get("pomodoroState"), "broken-json");
    assert.equal(timeLaunches().length, 4);
    await stopTimer();

    // Pause an actual storage write, then overlap two Start Work calls.
    // Only one can save a timer; the other must not overwrite it.
    let releaseWrite!: () => void;
    let enteredWrite!: () => void;
    const heldWrite = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      enteredWrite = resolve;
    });
    beforeWrite = async (key) => {
      if (key === "activeTimer") {
        enteredWrite();
        await heldWrite;
      }
    };
    const firstStart = startTimer("project", "First");
    await entered;
    await assert.rejects(startTimer("project", "Second"), /Another reminder operation/);
    releaseWrite();
    const winner = await firstStart;
    beforeWrite = undefined;
    assert.equal((await getActiveTimer())?.id, winner.id);
    assert.equal((await getActiveTimer())?.description, "First");
    items.delete("pomodoroState");

    // Stop Work cannot race an overlay write. A later stop removes both,
    // and an old interval cannot revive the stopped timer.
    const overlayEntered = new Promise<void>((resolve) => {
      enteredWrite = resolve;
    });
    const overlayHeld = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    beforeWrite = async (key) => {
      if (key === "pomodoroState") {
        enteredWrite();
        await overlayHeld;
      }
    };
    const overlayStart = startPomodoroInterval(winner.id);
    await overlayEntered;
    await assert.rejects(stopTimer(), /Another reminder operation/);
    assert.equal((await getActiveTimer())?.id, winner.id);
    releaseWrite();
    const overlay = await overlayStart;
    beforeWrite = undefined;
    assert.equal((await stopTimer()).status, "stopped");
    assert.equal(await getActiveTimer(), null);
    assert.equal(await getPomodoro(winner), null);
    await assert.rejects(startPomodoroInterval(winner.id, overlay.intervalId), /no longer running/);

    // A saved log with an uncleared timer is recovered without writing a second log.
    const logCount = (await getWorkLogs()).length;
    await saveActiveTimer(winner);
    assert.equal((await stopTimer()).status, "recovered");
    assert.equal((await getWorkLogs()).length, logCount);
    assert.equal(await getActiveTimer(), null);

    // Failed log writes cannot erase either running state. Retrying saves the log.
    const unsaved = await startTimer("project", "Save retry");
    const unsavedOverlay = await startPomodoroInterval(unsaved.id);
    beforeWrite = async (key) => {
      if (key.startsWith("workLog:")) throw new Error("log write failed");
    };
    await assert.rejects(stopTimer(), /log write failed/);
    assert.equal((await getActiveTimer())?.id, unsaved.id);
    assert.equal((await getPomodoro(unsaved))?.intervalId, unsavedOverlay.intervalId);
    beforeWrite = undefined;
    assert.equal((await stopTimer()).status, "stopped");
    assert.equal((await getWorkLogs()).length, logCount + 1);

    // Refresh can start checking immediately: timer and Pomodoro must both
    // already be saved, and the lock must be released before launching it.
    let refreshSawPomodoro = false;
    onRefresh = async () => {
      const current = await getActiveTimer();
      refreshSawPomodoro = Boolean(current && (await getPomodoro(current)));
      await checkReminders(current, new Date());
    };
    const atomicStart = await startTimer("project", "Atomic Pomodoro", true);
    assert.equal(refreshSawPomodoro, true);
    assert.equal((await getPomodoro(atomicStart))?.timerId, atomicStart.id);
    onRefresh = undefined;
    await stopTimer();

    // Refresh failure must not turn a saved start or next interval into failure.
    failRefresh = true;
    const refreshed = await startTimer("project", "Refresh fails", true);
    const savedOverlay = await getPomodoro(refreshed);
    assert.equal((await getActiveTimer())?.id, refreshed.id);
    assert.ok(savedOverlay);
    await endPomodoro(refreshed.id);
    const replacementOverlay = await startPomodoroInterval(refreshed.id);
    const { refreshMenuBar } = loadModule("../src/lib/timer.ts") as typeof import("../src/lib/timer");
    await refreshMenuBar();
    assert.equal((await getPomodoro(refreshed))?.intervalId, replacementOverlay.intervalId);
    failRefresh = false;
    await stopTimer();

    // Initial overlay failure rolls back the new timer before refreshing.
    beforeWrite = async (key) => {
      if (key === "pomodoroState") throw new Error("pomodoro write failed");
    };
    const launchesBeforeFailure = launched.length;
    await assert.rejects(startTimer("project", "Failed initial Pomodoro", true), /pomodoro write failed/);
    assert.equal(await getActiveTimer(), null);
    assert.equal(launched.length, launchesBeforeFailure);
    beforeWrite = undefined;

    // The opposite overlap is safe too: once Stop Work owns the write,
    // Pomodoro cannot save a session behind it.
    const stopping = await startTimer("project", "Stopping");
    const stopEntered = new Promise<void>((resolve) => {
      enteredWrite = resolve;
    });
    const stopHeld = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    beforeWrite = async (key) => {
      if (key.startsWith("workLog:")) {
        enteredWrite();
        await stopHeld;
      }
    };
    const pendingStop = stopTimer();
    await stopEntered;
    await assert.rejects(startPomodoroInterval(stopping.id), /Another reminder operation/);
    releaseWrite();
    assert.equal((await pendingStop).status, "stopped");
    beforeWrite = undefined;
    assert.equal(await getPomodoro(stopping), null);
    await assert.rejects(startPomodoroInterval(stopping.id), /no longer running/);
  } finally {
    hooks.deregister();
    delete globals.reminderTestAPI;
    await rm(directory, { recursive: true, force: true });
  }
});
