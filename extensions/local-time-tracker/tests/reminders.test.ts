import assert from "node:assert/strict";
import test from "node:test";
import {
  deliverReminders,
  dueReminders,
  isIntervalFinished,
  isPomodoroState,
  newInterval,
  nextPhase,
  positiveInteger,
  type ReminderSettings,
  type ReminderStore,
} from "../src/lib/reminders";
import type { ActiveTimer, WorkLog } from "../src/lib/types";

const settings: ReminderSettings = {
  pomodoroEnabled: true,
  dailyAlertEnabled: true,
  dailyAlertMinutes: 480,
  timerAlertEnabled: true,
  timerAlertMinutes: 480,
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
};
const start = new Date(2026, 9, 11, 0);
const at = (minutes: number) => new Date(start.getTime() + minutes * 60000);
const timer: ActiveTimer = { id: "timer", projectId: "project", description: "Task", startedAt: start.toISOString() };
function log(id: string, from: Date, to: Date): WorkLog {
  return {
    id,
    projectId: "project",
    description: "Task",
    startedAt: from.toISOString(),
    endedAt: to.toISOString(),
    createdAt: to.toISOString(),
    updatedAt: to.toISOString(),
  };
}
function memoryStore() {
  const items = new Map<string, string>();
  const store: ReminderStore = {
    async getItem(key) {
      return items.get(key);
    },
    async setItem(key, value) {
      items.set(key, value);
    },
  };
  return { store, items };
}

test("alerts at the threshold, never before it, with independent enable flags", () => {
  assert.equal(dueReminders(settings, [], timer, null, at(479)).length, 0);
  assert.equal(dueReminders(settings, [], timer, null, at(480)).length, 2);
  assert.equal(dueReminders(settings, [], timer, null, at(481)).length, 2);
  assert.equal(dueReminders({ ...settings, dailyAlertEnabled: false }, [], timer, null, at(480)).length, 1);
  assert.equal(
    dueReminders({ ...settings, dailyAlertEnabled: false, timerAlertEnabled: false }, [], timer, null, at(480)).length,
    0,
  );
});

test("daily totals combine multiple logs and the running timer, including edited logs", () => {
  const running = { ...timer, startedAt: at(360).toISOString() };
  const logs = [log("a", at(0), at(120)), log("b", at(120), at(359))];
  assert.equal(dueReminders(settings, logs, running, null, at(480)).length, 0);
  logs[1] = log("b", at(120), at(360));
  const events = dueReminders(settings, logs, running, null, at(480));
  assert.equal(events.length, 1);
  assert.match(events[0].key, /^daily:/);
});

test("local midnight splits totals and resets the daily notification identity", () => {
  const overnight = log("overnight", new Date(2026, 9, 10, 23, 30), at(30));
  const shortSettings = { ...settings, dailyAlertMinutes: 30, timerAlertEnabled: false };
  assert.equal(dueReminders(shortSettings, [overnight], null, null, at(29)).length, 0);
  const today = dueReminders(shortSettings, [overnight], null, null, at(30));
  const yesterday = dueReminders(
    shortSettings,
    [log("y", new Date(2026, 9, 10, 0), new Date(2026, 9, 10, 1))],
    null,
    null,
    new Date(2026, 9, 10, 12),
  );
  assert.notEqual(today[0].key, yesterday[0].key);
});

test("repeated checks, settings changes and reloads do not deliver the same alert twice", async () => {
  const { store } = memoryStore();
  const titles: string[] = [];
  const notify = async (title: string) => {
    titles.push(title);
  };
  await deliverReminders(dueReminders(settings, [], timer, null, at(480)), store, notify);
  await deliverReminders(
    dueReminders({ ...settings, dailyAlertMinutes: 300, timerAlertMinutes: 300 }, [], timer, null, at(481)),
    store,
    notify,
  );
  assert.equal(titles.length, 2);
  await deliverReminders(dueReminders(settings, [], { ...timer, id: "next-timer" }, null, at(480)), store, notify);
  assert.equal(titles.length, 3);
});

test("failed delivery remains pending and is retried", async () => {
  const { store, items } = memoryStore();
  const events = dueReminders({ ...settings, timerAlertEnabled: false }, [], timer, null, at(480));
  await assert.rejects(
    deliverReminders(events, store, async () => {
      throw new Error("delivery failed");
    }),
  );
  assert.equal(items.size, 0);
  let delivered = 0;
  await deliverReminders(events, store, async () => {
    delivered++;
  });
  await deliverReminders(events, store, async () => {
    delivered++;
  });
  assert.equal(delivered, 1);
});

test("pomodoro progresses manually with a long break after four work intervals", () => {
  let state = newInterval(timer.id, settings, start);
  assert.equal(state.phase, "work");
  for (let count = 1; count <= 4; count++) {
    const end = new Date(state.endsAt);
    assert.equal(isIntervalFinished(state, new Date(end.getTime() - 1)), false);
    assert.equal(isIntervalFinished(state, end), true);
    assert.equal(state.phase, "work");
    state = newInterval(timer.id, settings, end, state);
    assert.equal(state.phase, count === 4 ? "long-break" : "short-break");
    assert.equal(state.completedWork, count);
    assert.equal(Date.parse(state.endsAt) - Date.parse(state.startedAt), (count === 4 ? 15 : 5) * 60000);
    state = newInterval(timer.id, settings, new Date(state.endsAt), state);
  }
  assert.equal(state.phase, "work");
  assert.equal(state.completedWork, 4);
});

test("settings changes apply to the next interval, preserving the active snapshot", () => {
  const state = newInterval(timer.id, settings, start);
  const updated = { ...settings, shortBreakMinutes: 7, workMinutes: 40, longBreakEvery: 1 };
  assert.equal(nextPhase(state), "short-break");
  const next = newInterval(timer.id, updated, new Date(state.endsAt), state);
  assert.equal(Date.parse(state.endsAt) - Date.parse(state.startedAt), 25 * 60000);
  assert.equal(Date.parse(next.endsAt) - Date.parse(next.startedAt), 7 * 60000);
});

test("restart and sleep keep the overdue interval waiting, with only one completion notification", async () => {
  const original = newInterval(timer.id, settings, start);
  const restored = JSON.parse(JSON.stringify(original));
  assert.equal(isPomodoroState(restored), true);
  const { store } = memoryStore();
  let delivered = 0;
  await deliverReminders(dueReminders(settings, [], timer, restored, at(120)), store, async () => {
    delivered++;
  });
  await deliverReminders(dueReminders(settings, [], timer, restored, at(121)), store, async () => {
    delivered++;
  });
  assert.equal(delivered, 1);
  assert.equal(restored.phase, "work");
  assert.equal(restored.completedWork, 0);
});

test("stopped or replaced work timers cannot emit stale pomodoro reminders", () => {
  const state = newInterval(timer.id, settings, start);
  assert.equal(dueReminders(settings, [], null, state, at(25)).length, 0);
  assert.equal(dueReminders(settings, [], { ...timer, id: "replacement" }, state, at(25)).length, 0);
});

test("clock rollback does not complete intervals or trigger timer alerts", () => {
  const state = newInterval(timer.id, settings, start);
  assert.equal(isIntervalFinished(state, at(-1)), false);
  assert.equal(dueReminders(settings, [], timer, state, at(-1)).length, 0);
});

test("invalid preferences and damaged saved state are rejected or use defaults", () => {
  for (const value of ["", " ", "invalid", "0", "-1", "1.5", Infinity, "525601", undefined]) {
    assert.equal(positiveInteger(value, 25), 25);
  }
  assert.equal(positiveInteger("480", 25), 480);
  const state = newInterval(timer.id, settings, start);
  assert.equal(isPomodoroState({ ...state, endsAt: "invalid" }), false);
  assert.equal(isPomodoroState({ ...state, completedWork: -1 }), false);
  assert.equal(isPomodoroState({ ...state, longBreakEvery: 0 }), false);
});
