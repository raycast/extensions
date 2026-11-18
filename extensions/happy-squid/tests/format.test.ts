import { expect, test } from "vitest";
import type { TaskSnapshot } from "../src/vendor/task-control";
import { clockFace, duration, sameTaskSnapshot, taskSubtitle } from "../src/format";

const CAPTURED_AT = 1_700_000_000_000;
const MINUTE = 60_000;

/** Every task figure in the product spells hours and minutes, and Raycast's
 *  subtitle, detail and list are three more places one is shown. */
test("task times spell hours and minutes", () => {
  expect(duration(47 * MINUTE)).toBe("47m");
  expect(duration(60 * MINUTE)).toBe("1h");
  expect(duration(83 * MINUTE + 20_000)).toBe("1h 23m");
  expect(duration(0)).toBe("0m");
});

test("a running task's subtitle counts down in hours and minutes", () => {
  const snapshot = {
    capturedAt: CAPTURED_AT,
    task: { description: "Write launch notes", paused: false, openEnded: false, remainingMs: 83 * MINUTE + 20_000 },
    review: null,
  } as unknown as TaskSnapshot;
  expect(taskSubtitle(snapshot, CAPTURED_AT)).toBe("1h 23m left · Write launch notes");
});

const runningTask = {
  deviceId: "device-1",
  capturedAt: CAPTURED_AT,
  task: {
    id: "task-1",
    description: "Write launch notes",
    context: "",
    source: null,
    sourceUrl: null,
    startedAt: CAPTURED_AT - MINUTE,
    elapsedMs: MINUTE,
    remainingMs: 29 * MINUTE,
    paused: false,
    openEnded: false,
    locked: false,
    lockEndsAt: null,
    canLock: true,
  },
  review: null,
  recentTasks: [],
  durationChoices: [15, 30],
  defaultDurationMinutes: 5,
  customDurationAllowed: true,
  maxDurationMinutes: 1440,
  descriptionLimit: 2000,
  canStart: false,
  weekSpent: false,
} satisfies TaskSnapshot;

/** The same running task read a few seconds later: a new capture time, and its
 *  clock restated relative to it. */
function readLater(snapshot: TaskSnapshot, ms: number, drift = 0): TaskSnapshot {
  const task = snapshot.task!;
  return {
    ...snapshot,
    capturedAt: snapshot.capturedAt + ms,
    task: { ...task, elapsedMs: task.elapsedMs + ms + drift, remainingMs: task.remainingMs! - ms - drift },
  };
}

/** Raycast reports a page that redraws without changing as a rendering loop, so
 *  a read that restates what is already on screen must be recognised as such. */
test("a later read of the same task is the same snapshot, and a real change is not", () => {
  expect(sameTaskSnapshot(runningTask, readLater(runningTask, 3_000))).toBe(true);
  expect(sameTaskSnapshot(runningTask, readLater(runningTask, 3_000, 400))).toBe(true);
  expect(sameTaskSnapshot(runningTask, readLater(runningTask, 3_000, 5 * MINUTE))).toBe(false);
  expect(sameTaskSnapshot(runningTask, { ...runningTask, task: { ...runningTask.task, paused: true } })).toBe(false);
  expect(
    sameTaskSnapshot(runningTask, {
      ...runningTask,
      task: { ...runningTask.task, description: "Write the launch post" },
    }),
  ).toBe(false);
  const paused = { ...runningTask, task: { ...runningTask.task, paused: true } };
  expect(sameTaskSnapshot(paused, { ...paused, capturedAt: paused.capturedAt + MINUTE })).toBe(true);
  const idle = { ...runningTask, task: null, canStart: true };
  expect(sameTaskSnapshot(idle, { ...idle, capturedAt: idle.capturedAt + 3_000 })).toBe(true);
  const review = {
    ...idle,
    review: {
      id: "review-1",
      kind: "start" as const,
      description: "Watch YouTube",
      durationMinutes: 30,
      status: "unproductive" as const,
      chat: [{ role: "assistant", content: "Why?" }],
    },
  };
  expect(
    sameTaskSnapshot(review, {
      ...review,
      review: { ...review.review, chat: [...review.review.chat, { role: "user", content: "To learn." }] },
    }),
  ).toBe(false);
});

/** Minutes are rounded, so the clock only changes the page at the moments a
 *  figure on it moves: worked reaches 2m at 30 s, remaining 28m just after. */
test("the clock face changes only when a figure on screen moves", () => {
  const face = (ms: number) => clockFace(runningTask, CAPTURED_AT + ms);
  expect(face(29_000)).toBe(face(0));
  expect(face(30_000)).not.toBe(face(29_000));
  expect(face(31_000)).not.toBe(face(30_000));
  expect(face(59_000)).toBe(face(31_000));
});
