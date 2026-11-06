import assert from "node:assert/strict";
import test from "node:test";
import { createRoutineStore, type RoutineStorage } from "../src/lib/routine-store";
import {
  runRoutine,
  validateRoutine,
  RoutineValidationError,
  type Routine,
  type RoutineAdapter,
  type RoutineProgress,
} from "../src/lib/routines";

function routine(overrides: Partial<Routine> = {}): Routine {
  return { id: "routine-1", name: "Movie Night", deviceId: "roku-1", steps: [{ type: "wake" }], ...overrides };
}

function recordingAdapter(events: string[]): RoutineAdapter {
  return {
    async wake() {
      events.push("wake");
    },
    async launch(id) {
      events.push(`launch:${id}`);
    },
    async key(key) {
      events.push(`key:${key}`);
    },
    async restore() {
      events.push("restore");
    },
  };
}

function memoryStorage(initial: Record<string, unknown> = {}): RoutineStorage & { records: Map<string, unknown> } {
  const records = new Map(Object.entries(initial));
  return {
    records,
    async allItems() {
      return Object.fromEntries(records);
    },
    async setItem(key, value) {
      records.set(key, value);
    },
    async removeItem(key) {
      records.delete(key);
    },
  };
}

test("routine validation normalizes a copy and keeps device selection explicit", () => {
  const original = routine({ name: "  Movie Night  ", steps: [{ type: "key", key: "VolumeDown" }] });
  const parsed = validateRoutine(original);
  assert.equal(parsed.name, "Movie Night");
  assert.deepEqual(parsed.steps, [{ type: "key", key: "VolumeDown", count: 1 }]);
  assert.equal(original.name, "  Movie Night  ");
  assert.notEqual(parsed.steps, original.steps);
  assert.throws(() => validateRoutine(routine({ deviceId: "" })), RoutineValidationError);
});

test("rejects empty or oversized routines, invalid repeats/waits and arbitrary endpoint commands", () => {
  for (const steps of [[], Array.from({ length: 21 }, () => ({ type: "wake" }))]) {
    assert.throws(() => validateRoutine({ ...routine(), steps }), RoutineValidationError);
  }
  for (const count of [0, 21, 1.5, "2", NaN]) {
    assert.throws(
      () => validateRoutine({ ...routine(), steps: [{ type: "key", key: "Play", count }] }),
      RoutineValidationError,
    );
  }
  for (const seconds of [-1, 31, Infinity, NaN, "2"]) {
    assert.throws(() => validateRoutine({ ...routine(), steps: [{ type: "wait", seconds }] }), RoutineValidationError);
  }
  for (const step of [
    { type: "key", key: "Power" },
    { type: "key", key: "Home?x=1" },
    { type: "key", key: "Lit_a" },
    { type: "key", key: "InputHDMI1" },
    { type: "launch", appId: "../install/12" },
    { type: "launch", appId: ".." },
    { type: "request", path: "/install/1" },
  ])
    assert.throws(() => validateRoutine({ ...routine(), steps: [step] }), RoutineValidationError);
  assert.doesNotThrow(() =>
    validateRoutine(
      routine({
        steps: [
          { type: "key", key: "PowerOff" },
          { type: "wait", seconds: 30 },
        ],
      }),
    ),
  );
});

test("runner executes every step and repeat in order, with before/after progress", async () => {
  const events: string[] = [];
  const progress: RoutineProgress[] = [];
  const result = await runRoutine(
    routine({
      steps: [
        { type: "wake" },
        { type: "launch", appId: "tvinput.hdmi1", appName: "Console" },
        { type: "wait", seconds: 0 },
        { type: "key", key: "VolumeDown", count: 2 },
        { type: "restore" },
      ],
    }),
    recordingAdapter(events),
    {
      onProgress(value) {
        progress.push(value);
      },
    },
  );
  assert.deepEqual(events, ["wake", "launch:tvinput.hdmi1", "key:VolumeDown", "key:VolumeDown", "restore"]);
  assert.deepEqual(result, { status: "completed", completedSteps: 5, totalSteps: 5 });
  assert.equal(progress.length, 10);
  assert.deepEqual(
    progress.map((item) => item.status),
    Array.from({ length: 5 }, () => ["running", "completed"]).flat(),
  );
  assert.equal(progress[0].stepIndex, 0);
  assert.equal(progress[0].stepNumber, 1);
  assert.equal(progress[8].stepNumber, 5);
});

test("failure stops subsequent work and identifies the failing step", async () => {
  const events: string[] = [];
  const adapter = recordingAdapter(events);
  adapter.launch = async () => {
    throw new Error("TV disconnected");
  };
  const result = await runRoutine(
    routine({ steps: [{ type: "wake" }, { type: "launch", appId: "12" }, { type: "restore" }] }),
    adapter,
  );
  assert.deepEqual(events, ["wake"]);
  assert.equal(result.status, "failed");
  assert.equal(result.completedSteps, 1);
  assert.equal(result.failedStepIndex, 1);
  assert.match(result.error ?? "", /Step 2.*TV disconnected/);
});

test("invalid routines fail before issuing any device command", async () => {
  const events: string[] = [];
  const result = await runRoutine(routine({ steps: [{ type: "key", key: "unvalidated" }] }), recordingAdapter(events));
  assert.equal(result.status, "failed");
  assert.equal(result.completedSteps, 0);
  assert.deepEqual(events, []);
});

test("already-cancelled runs do no work", async () => {
  const events: string[] = [];
  const controller = new AbortController();
  controller.abort();
  const result = await runRoutine(routine(), recordingAdapter(events), { signal: controller.signal });
  assert.equal(result.status, "cancelled");
  assert.equal(result.cancelledStepIndex, 0);
  assert.deepEqual(events, []);
});

test("cancellation interrupts a wait promptly and prevents the next command", async () => {
  const events: string[] = [];
  const controller = new AbortController();
  const start = performance.now();
  const timer = setTimeout(() => controller.abort(), 25);
  try {
    const result = await runRoutine(
      routine({ steps: [{ type: "wait", seconds: 30 }, { type: "wake" }] }),
      recordingAdapter(events),
      { signal: controller.signal },
    );
    assert.equal(result.status, "cancelled");
    assert.equal(result.completedSteps, 0);
    assert.ok(performance.now() - start < 1000);
    assert.deepEqual(events, []);
  } finally {
    clearTimeout(timer);
  }
});

test("cancellation during a repeated command stops remaining repeats without claiming the step completed", async () => {
  const events: string[] = [];
  const controller = new AbortController();
  const adapter = recordingAdapter(events);
  adapter.key = async (key) => {
    events.push(key);
    controller.abort();
  };
  const result = await runRoutine(
    routine({ steps: [{ type: "key", key: "VolumeDown", count: 3 }, { type: "restore" }] }),
    adapter,
    { signal: controller.signal },
  );
  assert.deepEqual(events, ["VolumeDown"]);
  assert.equal(result.status, "cancelled");
  assert.equal(result.completedSteps, 0);
});

test("progress observers cannot mutate the validated command to be executed", async () => {
  const events: string[] = [];
  const result = await runRoutine(routine({ steps: [{ type: "launch", appId: "12" }] }), recordingAdapter(events), {
    onProgress(progress) {
      if (progress.step.type === "launch") progress.step.appId = "../install/1";
    },
  });
  assert.equal(result.status, "completed");
  assert.deepEqual(events, ["launch:12"]);
});

test("routine store preserves independent concurrent records and updates/removes by stable ID", async () => {
  const storage = memoryStorage({ unrelated: "leave me" });
  const store = createRoutineStore(storage);
  await Promise.all([store.saveRoutine(routine()), store.saveRoutine(routine({ id: "other", deviceId: "roku-2" }))]);
  assert.equal((await store.getRoutines()).length, 2);
  await store.saveRoutine(routine({ name: "Renamed" }));
  assert.equal((await store.getRoutines()).find((item) => item.id === "routine-1")?.name, "Renamed");
  await store.removeRoutine("other");
  assert.deepEqual(
    (await store.getRoutines()).map((item) => item.id),
    ["routine-1"],
  );
  assert.equal(storage.records.get("unrelated"), "leave me");
});

test("corrupt and mismatched stored records are skipped without preventing new saves", async () => {
  const storage = memoryStorage({
    "roku-direct.routine.v1.broken": "not-json",
    "roku-direct.routine.v1.bad": JSON.stringify({ version: 1, routine: { id: "bad" } }),
    "roku-direct.routine.v1.wrong-key": JSON.stringify({ version: 1, routine: routine() }),
  });
  const store = createRoutineStore(storage);
  assert.deepEqual(await store.getRoutines(), []);
  await store.saveRoutine(routine());
  assert.equal((await store.getRoutines()).length, 1);
});

test("a failed storage write does not prevent later saves", async () => {
  const storage = memoryStorage();
  const save = storage.setItem;
  let fail = true;
  storage.setItem = async (key, value) => {
    if (fail) {
      fail = false;
      throw new Error("Disk full");
    }
    await save(key, value);
  };
  const store = createRoutineStore(storage);
  await assert.rejects(store.saveRoutine(routine()), /Disk full/);
  await store.saveRoutine(routine({ id: "second" }));
  assert.deepEqual(
    (await store.getRoutines()).map((item) => item.id),
    ["second"],
  );
});
