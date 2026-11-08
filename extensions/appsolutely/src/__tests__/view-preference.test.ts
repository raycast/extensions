import assert from "node:assert/strict";
import { test } from "node:test";
import { ViewPreference, VIEW_MODE_KEY, VIEW_MODES, nextViewMode } from "../services/view-preference.ts";

function memoryStorage(saved?: string) {
  const values = new Map<string, string>(saved === undefined ? [] : [[VIEW_MODE_KEY, saved]]);
  return {
    values,
    getItem: async (key: string) => values.get(key),
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

test("a new or unrecognized view preference defaults to grid without overwriting saved data", async () => {
  for (const saved of [undefined, "grid", "unknown"]) {
    const storage = memoryStorage(saved);
    const preference = new ViewPreference(storage);
    assert.equal(preference.getSnapshot().isLoading, true);
    await preference.load();
    assert.deepEqual(preference.getSnapshot(), { mode: "grid", isLoading: false });
    assert.equal(storage.values.get(VIEW_MODE_KEY), saved);
  }
});

test("the selected view survives reopening and is independent of layout changes", async () => {
  const storage = memoryStorage();
  const preference = new ViewPreference(storage);
  await preference.setMode("list");
  await storage.setItem("appsolutely.layout", JSON.stringify({ version: 1, folders: [], assignments: [] }));
  const reopened = new ViewPreference(storage);
  await reopened.load();
  assert.equal(reopened.getSnapshot().mode, "list");
  await reopened.setMode("grid");
  const reopenedAgain = new ViewPreference(storage);
  await reopenedAgain.load();
  assert.equal(reopenedAgain.getSnapshot().mode, "grid");
});

test("large grid is remembered without changing existing grid and list preferences", async () => {
  for (const mode of VIEW_MODES) {
    const storage = memoryStorage();
    const preference = new ViewPreference(storage);
    await preference.setMode(mode);
    const reopened = new ViewPreference(storage);
    await reopened.load();
    assert.equal(reopened.getSnapshot().mode, mode);
  }
  assert.equal(nextViewMode("grid"), "grid-large");
  assert.equal(nextViewMode("grid-large"), "list");
  assert.equal(nextViewMode("list"), "grid");
});

test("a view chosen during startup is saved after the stored preference has loaded", async () => {
  let finishRead!: (value: string) => void;
  let saved: string | undefined;
  const preference = new ViewPreference({
    getItem: () =>
      new Promise((resolve) => {
        finishRead = resolve;
      }),
    setItem: async (_key, value) => {
      saved = value;
    },
  });
  const loading = preference.load();
  const saving = preference.setMode("grid");
  assert.equal(saved, undefined);
  finishRead("list");
  await Promise.all([loading, saving]);
  assert.equal(saved, "grid");
  assert.equal(preference.getSnapshot().mode, "grid");
});

test("rapid changes are serialized, and failed saves retain the last saved choice without blocking retry", async () => {
  const storage = memoryStorage("grid");
  let fail = false;
  const writes: string[] = [];
  const preference = new ViewPreference({
    getItem: storage.getItem,
    setItem: async (key, value) => {
      if (fail) throw new Error("Storage unavailable");
      writes.push(value);
      await storage.setItem(key, value);
    },
  });
  await preference.load();
  const observed: string[] = [];
  const unsubscribe = preference.subscribe(() => observed.push(preference.getSnapshot().mode));
  await Promise.all([preference.setMode("list"), preference.setMode("grid"), preference.setMode("list")]);
  assert.deepEqual(writes, ["list", "grid", "list"]);
  assert.deepEqual(observed, writes);
  fail = true;
  await assert.rejects(preference.setMode("grid"), /Storage unavailable/);
  assert.equal(preference.getSnapshot().mode, "list");
  assert.equal(storage.values.get(VIEW_MODE_KEY), "list");
  fail = false;
  await preference.setMode("grid");
  assert.equal(preference.getSnapshot().mode, "grid");
  unsubscribe();
});

test("a failed preference read leaves the launcher usable and an explicit choice can recover", async () => {
  const storage = memoryStorage();
  const preference = new ViewPreference({
    getItem: async () => {
      throw new Error("Cannot read preference");
    },
    setItem: storage.setItem,
  });
  await preference.load();
  assert.equal(preference.getSnapshot().isLoading, false);
  assert.equal(preference.getSnapshot().mode, "grid");
  assert.equal(preference.getSnapshot().error?.message, "Cannot read preference");
  await preference.setMode("list");
  assert.equal(storage.values.get(VIEW_MODE_KEY), "list");
  assert.equal(preference.getSnapshot().error, undefined);
});

test("the selector changes immediately during a slow save and rolls back if that save fails", async () => {
  let rejectSave!: (error: Error) => void;
  const preference = new ViewPreference({
    getItem: async () => "grid",
    setItem: () =>
      new Promise((_resolve, reject) => {
        rejectSave = reject;
      }),
  });
  await preference.load();
  const saving = preference.setMode("list");
  assert.equal(preference.getSnapshot().mode, "list");
  // Let the queued operation reach storage while the requested choice stays visible.
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(preference.getSnapshot().mode, "list");
  rejectSave(new Error("Storage unavailable"));
  await assert.rejects(saving, /Storage unavailable/);
  assert.equal(preference.getSnapshot().mode, "grid");
});

test("an older failed save cannot undo a newer choice, and rollback uses the last successful save", async () => {
  const writes: { value: string; resolve: () => void; reject: (error: Error) => void }[] = [];
  const preference = new ViewPreference({
    getItem: async () => "grid",
    setItem: (_key, value) =>
      new Promise((resolve, reject) => {
        writes.push({ value, resolve, reject });
      }),
  });
  await preference.load();
  const first = preference.setMode("list");
  const failedFirst = assert.rejects(first, /First failed/);
  const second = preference.setMode("grid");
  const third = preference.setMode("list");
  const failedThird = assert.rejects(third, /Third failed/);
  await new Promise((resolve) => setImmediate(resolve));
  writes[0].reject(new Error("First failed"));
  await failedFirst;
  assert.equal(preference.getSnapshot().mode, "list");
  await new Promise((resolve) => setImmediate(resolve));
  writes[1].resolve();
  await second;
  assert.equal(preference.getSnapshot().mode, "list");
  await new Promise((resolve) => setImmediate(resolve));
  writes[2].reject(new Error("Third failed"));
  await failedThird;
  assert.deepEqual(
    writes.map((write) => write.value),
    ["list", "grid", "list"],
  );
  assert.equal(preference.getSnapshot().mode, "grid");
});
