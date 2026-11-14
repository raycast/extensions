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
import type { ActiveTimer } from "../src/lib/types";

const settings: ReminderSettings = {
  pomodoroEnabled: true,
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

test("timer alerts at the threshold, never before it, and respect the enable flag", () => {
  assert.equal(dueReminders(settings, timer, null, at(479)).length, 0);
  assert.equal(dueReminders(settings, timer, null, at(480)).length, 1);
  assert.equal(dueReminders(settings, timer, null, at(481)).length, 1);
  assert.equal(dueReminders({ ...settings, timerAlertEnabled: false }, timer, null, at(480)).length, 0);
});

test("crossing midnight does not reset a timer alert's identity", () => {
  const overnight = { ...timer, startedAt: new Date(2026, 9, 10, 23, 30).toISOString() };
  const shortSettings = { ...settings, timerAlertMinutes: 10 };
  const beforeMidnight = dueReminders(shortSettings, overnight, null, new Date(2026, 9, 10, 23, 40));
  const afterMidnight = dueReminders(shortSettings, overnight, null, at(1));
  assert.equal(beforeMidnight[0].key, afterMidnight[0].key);
});

test("repeated checks, settings changes and reloads do not deliver the same alert twice", async () => {
  const { store } = memoryStore();
  const titles: string[] = [];
  const notify = async (title: string) => {
    titles.push(title);
  };
  await deliverReminders(dueReminders(settings, timer, null, at(480)), store, notify);
  await deliverReminders(dueReminders({ ...settings, timerAlertMinutes: 300 }, timer, null, at(481)), store, notify);
  assert.equal(titles.length, 1);
  await deliverReminders(dueReminders(settings, { ...timer, id: "next-timer" }, null, at(480)), store, notify);
  assert.equal(titles.length, 2);
});

test("failed delivery remains pending and is retried", async () => {
  const { store, items } = memoryStore();
  const events = dueReminders(settings, timer, null, at(480));
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

test("one failed notification does not block independent alerts", async () => {
  const { store, items } = memoryStore();
  const state = newInterval(timer.id, settings, start);
  const events = dueReminders(settings, timer, state, at(480));
  const delivered: string[] = [];
  await assert.rejects(
    deliverReminders(events, store, async (_title, event) => {
      if (event.key.startsWith("timer:")) throw new Error("timer delivery failed");
      delivered.push(event.key);
    }),
    /timer delivery failed/,
  );
  assert.deepEqual(delivered, [`pomodoro:${state.intervalId}`]);
  assert.equal(items.has(`reminderNotified:pomodoro:${state.intervalId}`), true);
  assert.equal(items.has(`reminderNotified:${events[0].key}`), false);
});

test("pomodoro progresses manually with a long break after four work intervals", () => {
  let state = newInterval(timer.id, settings, start);
  assert.equal(state.phase, "work");
  for (let count = 1; count <= 8; count++) {
    const end = new Date(state.endsAt);
    assert.equal(isIntervalFinished(state, new Date(end.getTime() - 1)), false);
    assert.equal(isIntervalFinished(state, end), true);
    assert.equal(state.phase, "work");
    state = newInterval(timer.id, settings, end, state);
    assert.equal(state.phase, count % 4 === 0 ? "long-break" : "short-break");
    assert.equal(state.completedWork, count);
    assert.equal(Date.parse(state.endsAt) - Date.parse(state.startedAt), (count % 4 === 0 ? 15 : 5) * 60000);
    state = newInterval(timer.id, settings, new Date(state.endsAt), state);
  }
  assert.equal(state.phase, "work");
  assert.equal(state.completedWork, 8);
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
  await deliverReminders(dueReminders(settings, timer, restored, at(120)), store, async () => {
    delivered++;
  });
  await deliverReminders(dueReminders(settings, timer, restored, at(121)), store, async () => {
    delivered++;
  });
  assert.equal(delivered, 1);
  assert.equal(restored.phase, "work");
  assert.equal(restored.completedWork, 0);
});

test("stopped or replaced work timers cannot emit stale pomodoro reminders", () => {
  const state = newInterval(timer.id, settings, start);
  assert.equal(dueReminders(settings, null, state, at(25)).length, 0);
  assert.equal(dueReminders(settings, { ...timer, id: "replacement" }, state, at(25)).length, 0);
});

test("clock rollback does not complete intervals or trigger timer alerts", () => {
  const state = newInterval(timer.id, settings, start);
  assert.equal(isIntervalFinished(state, at(-1)), false);
  assert.equal(dueReminders(settings, timer, state, at(-1)).length, 0);
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
