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
      if (options.name === "start-work" && options.context && failDelivery) throw new Error("notification failed");
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
    const { startTimer, stopTimer, updateTimerStart } = loadModule(
      "../src/lib/timer.ts",
    ) as typeof import("../src/lib/timer");
    const { getActiveTimer, getWorkLogs, saveActiveTimer, getProjectGroups } = loadModule(
      "../src/lib/storage.ts",
    ) as typeof import("../src/lib/storage");
    const { startPomodoroInterval, getPomodoro, getFinishedPomodoro, checkReminders, endPomodoro } = loadModule(
      "../src/lib/reminder-service.ts",
    ) as typeof import("../src/lib/reminder-service");

    // Missing groups remain empty; loading saved Store-format groups preserves JSON.
    assert.deepEqual(await getProjectGroups(), []);
    const group = {
      id: "group-uuid",
      name: "Work",
      icon: "Folder",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };
    const savedGroupJson = JSON.stringify([group]);
    items.set("projectCategories", savedGroupJson);
    assert.deepEqual(await getProjectGroups(), [group]);
    assert.equal(items.get("projectCategories"), savedGroupJson);

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

    // Reopening Start Work can recover the finished interval even after its
    // one-time notification was delivered, without delivering it again.
    const beforeReopen = new Map(items);
    const launchesBeforeReopen = launched.length;
    assert.equal(await getFinishedPomodoro(past, new Date(dueAt.getTime() - 1)), null);
    assert.equal((await getFinishedPomodoro(past, dueAt))?.intervalId, preserved.intervalId);
    assert.equal(await getFinishedPomodoro(past, dueAt, "stale-interval"), null);
    assert.equal(await getFinishedPomodoro(null, dueAt), null);
    assert.equal(await getFinishedPomodoro({ ...past, id: "other-timer" }, dueAt), null);
    assert.equal(
      await getFinishedPomodoro({ ...past, startedAt: new Date(dueAt.getTime() + 1).toISOString() }, dueAt),
      null,
    );
    preferences.pomodoroEnabled = false;
    assert.equal(await getFinishedPomodoro(past, dueAt), null);
    preferences.pomodoroEnabled = true;
    assert.deepEqual(items, beforeReopen);
    assert.equal(launched.length, launchesBeforeReopen);

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

    // A completion screen can request a display update while notification
    // processing owns the lock, without changing the timer, interval or delivery keys.
    const { withReminderOperation } = loadModule(
      "../src/lib/reminder-service.ts",
    ) as typeof import("../src/lib/reminder-service");
    const displayTimer = await startTimer("project", "Display refresh", true);
    const displayOverlay = await getPomodoro(displayTimer);
    const beforeDisplayRefresh = new Map(items);
    const beforeDisplayLaunches = launched.length;
    await withReminderOperation(() => refreshMenuBar({ displayOnly: true }));
    assert.deepEqual(launched.slice(beforeDisplayLaunches), [{ name: "menu-bar", type: "background" }]);
    const { isMenuBarDisplayRefresh } = loadModule(
      "../src/lib/menu-bar-refresh.ts",
    ) as typeof import("../src/lib/menu-bar-refresh");
    assert.equal(await isMenuBarDisplayRefresh(), true);
    const expiry = items.get("menuBarDisplayRefreshUntil") as number;
    assert.equal(await isMenuBarDisplayRefresh(expiry + 1), false);
    assert.equal(await isMenuBarDisplayRefresh(expiry - 10001), false);
    const afterDisplayRefresh = new Map(items);
    afterDisplayRefresh.delete("menuBarDisplayRefreshUntil");
    assert.deepEqual(afterDisplayRefresh, beforeDisplayRefresh);
    assert.equal((await getPomodoro(displayTimer))?.intervalId, displayOverlay?.intervalId);
    assert.equal((await getActiveTimer())?.id, displayTimer.id);
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
    await assert.rejects(
      updateTimerStart(stopping.id, stopping.startedAt, new Date(Date.now() - 1800000)),
      /Another reminder operation/,
    );
    releaseWrite();
    assert.equal((await pendingStop).status, "stopped");
    beforeWrite = undefined;
    assert.equal(await getPomodoro(stopping), null);
    await assert.rejects(startPomodoroInterval(stopping.id), /no longer running/);

    // Correcting work time leaves the entire Pomodoro state untouched. Refresh
    // sees the saved time and can deliver an overdue alert after the lock releases.
    preferences.timerAlertMinutes = "1";
    const editable = await startTimer("project", "Forgot to start", true);
    const editableOverlay = await getPomodoro(editable);
    const correctedStart = new Date(Date.now() - 1800000);
    const alertsBeforeEdit = timeLaunches().length;
    onRefresh = async () => {
      const current = await getActiveTimer();
      assert.equal(current?.startedAt, correctedStart.toISOString());
      await checkReminders(current, new Date());
    };
    const corrected = await updateTimerStart(editable.id, editable.startedAt, correctedStart);
    onRefresh = undefined;
    assert.deepEqual(corrected, { ...editable, startedAt: correctedStart.toISOString() });
    assert.deepEqual(await getActiveTimer(), corrected);
    assert.deepEqual(await getPomodoro(corrected), editableOverlay);
    assert.equal(timeLaunches().length, alertsBeforeEdit + 1);

    // An old screen, invalid input and a future time cannot overwrite the edit.
    const beforeRejectedEdit = new Map(items);
    await assert.rejects(updateTimerStart(editable.id, editable.startedAt, correctedStart), /start time has changed/);
    await assert.rejects(updateTimerStart(corrected.id, corrected.startedAt, new Date(NaN)), /valid start/);
    await assert.rejects(
      updateTimerStart(corrected.id, corrected.startedAt, new Date(Date.now() + 60000)),
      /cannot be in the future/,
    );
    assert.deepEqual(items, beforeRejectedEdit);

    // Moving time forward and back must never repeat an already delivered alert.
    const later = await updateTimerStart(corrected.id, corrected.startedAt, new Date());
    await checkReminders(later, new Date());
    const earlier = await updateTimerStart(later.id, later.startedAt, correctedStart);
    await checkReminders(earlier, new Date());
    assert.equal(timeLaunches().length, alertsBeforeEdit + 1);
    assert.deepEqual(await getPomodoro(earlier), editableOverlay);

    // Storage failure preserves work, Pomodoro and notification state.
    const beforeFailedEdit = new Map(items);
    beforeWrite = async (key) => {
      if (key === "activeTimer") throw new Error("timer write failed");
    };
    await assert.rejects(updateTimerStart(earlier.id, earlier.startedAt, new Date()), /timer write failed/);
    assert.deepEqual(items, beforeFailedEdit);
    beforeWrite = undefined;

    // While an edit owns the storage write, neither Stop Work nor notification
    // checks can use the old time. The retry stops with the corrected start.
    const editEntered = new Promise<void>((resolve) => {
      enteredWrite = resolve;
    });
    const editHeld = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    beforeWrite = async (key) => {
      if (key === "activeTimer") {
        enteredWrite();
        await editHeld;
      }
    };
    const finalStart = new Date(Date.now() - 3600000);
    const pendingEdit = updateTimerStart(earlier.id, earlier.startedAt, finalStart);
    await editEntered;
    await assert.rejects(stopTimer(), /Another reminder operation/);
    await assert.rejects(checkReminders(earlier, new Date()), /Another reminder operation/);
    await assert.rejects(updateTimerStart(earlier.id, earlier.startedAt, new Date()), /Another reminder operation/);
    releaseWrite();
    const finalTimer = await pendingEdit;
    beforeWrite = undefined;
    const { createReport } = loadModule("../src/lib/reports.ts") as typeof import("../src/lib/reports");
    const { getDurationSeconds } = loadModule("../src/lib/duration.ts") as typeof import("../src/lib/duration");
    const { getDateRange, getOverlapDurationSeconds } = loadModule(
      "../src/lib/date.ts",
    ) as typeof import("../src/lib/date");
    const reportNow = new Date();
    const report = createReport("month", [], [], finalTimer, reportNow);
    const month = getDateRange("month", reportNow);
    assert.equal(
      report.totalSeconds,
      getOverlapDurationSeconds(finalTimer.startedAt, reportNow, month.start, month.end),
    );
    const editedStop = await stopTimer();
    assert.equal(editedStop.status, "stopped");
    if (editedStop.status !== "stopped") throw new Error("Expected stopped timer");
    assert.equal(editedStop.workLog.startedAt, finalStart.toISOString());
    assert.equal(editedStop.workLog.id, editable.id);
    const stoppedReport = createReport("month", [editedStop.workLog], [], null, new Date(editedStop.workLog.endedAt));
    assert.equal(editedStop.durationSeconds, getDurationSeconds(finalStart, editedStop.workLog.endedAt));
    const stoppedMonth = getDateRange("month", new Date(editedStop.workLog.endedAt));
    assert.equal(
      stoppedReport.totalSeconds,
      getOverlapDurationSeconds(finalStart, editedStop.workLog.endedAt, stoppedMonth.start, stoppedMonth.end),
    );
    await assert.rejects(updateTimerStart(finalTimer.id, finalTimer.startedAt, new Date()), /no longer running/);

    // Recovery state is not editable, and an old screen cannot change a new timer.
    await saveActiveTimer(finalTimer);
    await assert.rejects(updateTimerStart(finalTimer.id, finalTimer.startedAt, new Date()), /saved work log/);
    assert.deepEqual(await getActiveTimer(), finalTimer);
    assert.equal((await stopTimer()).status, "recovered");
    const differentTimer = await startTimer("project", "Different timer");
    await assert.rejects(updateTimerStart(finalTimer.id, finalTimer.startedAt, new Date()), /no longer running/);
    assert.deepEqual(await getActiveTimer(), differentTimer);
    failRefresh = true;
    const savedDespiteRefresh = await updateTimerStart(differentTimer.id, differentTimer.startedAt, correctedStart);
    assert.deepEqual(await getActiveTimer(), savedDespiteRefresh);
    failRefresh = false;
    await stopTimer();
  } finally {
    hooks.deregister();
    delete globals.reminderTestAPI;
    await rm(directory, { recursive: true, force: true });
  }
});
