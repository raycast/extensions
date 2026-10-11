import assert from "node:assert/strict";
import { createRequire, registerHooks } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("reminder service integrates with Stop Work, storage and notification retries", async () => {
  const directory = await mkdtemp(join(tmpdir(), "local-time-tracker-service-"));
  const items = new Map<string, string | number>();
  const delivered: string[] = [];
  let failDelivery = false;
  const preferences = {
    pomodoroEnabled: true,
    dailyAlertEnabled: true,
    dailyAlertMinutes: "1",
    timerAlertEnabled: true,
    timerAlertMinutes: "1",
  };
  const api = {
    environment: { supportPath: directory },
    getPreferenceValues: () => preferences,
    LocalStorage: {
      async getItem(key: string) {
        return items.get(key);
      },
      async setItem(key: string, value: string | number) {
        items.set(key, value);
      },
      async removeItem(key: string) {
        items.delete(key);
      },
      async allItems() {
        return Object.fromEntries(items);
      },
    },
    Toast: { Style: { Success: "success" } },
    async showToast({ title }: { title: string }) {
      if (failDelivery) throw new Error("notification failed");
      delivered.push(title);
    },
    LaunchType: { Background: "background" },
    async launchCommand() {},
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
    await checkReminders([], timer, new Date());
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
    await assert.rejects(checkReminders([], past, new Date()), /notification failed/);
    failDelivery = false;
    assert.deepEqual(await checkReminders([], past, new Date()), { dailyReached: true, timerReached: true });
    assert.equal(delivered.length, 2);
    await checkReminders([], past, new Date());
    assert.equal(delivered.length, 2);
    preferences.dailyAlertMinutes = "999";
    preferences.timerAlertMinutes = "999";
    assert.deepEqual(await checkReminders([], past, new Date()), { dailyReached: true, timerReached: true });

    // A clock rollback leaves both the regular timer and overlay intact.
    const preserved = await startPomodoroInterval(past.id);
    await saveActiveTimer({ ...past, startedAt: new Date(Date.now() + 60000).toISOString() });
    assert.equal((await stopTimer()).status, "clock-rollback");
    assert.equal((await getPomodoro(past))?.intervalId, preserved.intervalId);
  } finally {
    hooks.deregister();
    delete globals.reminderTestAPI;
    await rm(directory, { recursive: true, force: true });
  }
});
