import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyState } from "../models/folder.ts";
import { decodeState, encodeState, UnsupportedSchemaError } from "../services/state-codec.ts";
import { LayoutRepository, STORAGE_KEY } from "../services/state-repository.ts";
import { createFolder, renameFolder } from "../utils/hierarchy.ts";

function memoryStorage(initial?: string) {
  const values = new Map<string, string>(initial === undefined ? [] : [[STORAGE_KEY, initial]]);
  return {
    values,
    getItem: async (key: string) => values.get(key),
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

test("v1 round trip and absent storage preserve the expected schema", () => {
  const state = createFolder(emptyState(), "dev", "Development", null);
  state.assignments.push({ appId: "bundle:missing", folderId: "dev", order: 4 });
  assert.deepEqual(decodeState(encodeState(state)), { state, recovered: false });
  assert.deepEqual(decodeState(undefined), { state: emptyState(), recovered: false });
});

test("unversioned and v0 layouts migrate to v1", () => {
  for (const version of [undefined, 0]) {
    const result = decodeState(JSON.stringify({ version, folders: [], assignments: [] }));
    assert.equal(result.state.version, 1);
    assert.equal(result.recovered, true);
  }
});

test("malformed JSON, invalid records, duplicate IDs, orphans and cycles recover safely", () => {
  for (const raw of ["{broken", "null", "[]", '"oops"']) {
    assert.deepEqual(decodeState(raw), { state: emptyState(), recovered: true });
  }
  const result = decodeState(
    JSON.stringify({
      version: 1,
      folders: [
        { id: "a", name: "A", parentId: "b", order: "invalid" },
        { id: "b", name: "B", parentId: "a" },
        { id: "a", name: "Duplicate" },
        { id: "c", name: "C", parentId: "missing" },
        { id: "bad", name: " " },
      ],
      assignments: [
        { appId: "app", folderId: "a", order: 1 },
        { appId: "app", folderId: "missing", order: null },
        { appId: "absent-app", folderId: "b", order: 3 },
        { appId: 42 },
      ],
    }),
  );
  assert.equal(result.state.folders.length, 3);
  assert.equal(result.state.folders[0].parentId, null);
  assert.equal(result.state.folders[2].parentId, null);
  assert.deepEqual(result.state.assignments, [
    { appId: "app", folderId: null, order: 0 },
    { appId: "absent-app", folderId: "b", order: 3 },
  ]);
});

test("future schemas cannot be overwritten", async () => {
  const raw = JSON.stringify({ version: 99, folders: [] });
  assert.throws(() => decodeState(raw), UnsupportedSchemaError);
  const storage = memoryStorage(raw);
  const repository = new LayoutRepository(storage);
  await repository.load();
  assert.equal(repository.getSnapshot().status, "error");
  await assert.rejects(repository.update(emptyState));
  assert.equal(storage.values.get(STORAGE_KEY), raw);
});

test("recovery saves the original before allowing edits and restores usable state", async () => {
  const storage = memoryStorage("broken layout");
  const repository = new LayoutRepository(storage);
  await repository.load();
  assert.ok(repository.getSnapshot().warning);
  assert.ok(
    [...storage.values.entries()].some(
      ([key, value]) => key.startsWith(`${STORAGE_KEY}.recovery.`) && value === "broken layout",
    ),
  );
  await repository.update((s) => createFolder(s, "dev", "Development", null));
  const reopened = new LayoutRepository(storage);
  await reopened.load();
  assert.equal(reopened.getSnapshot().state.folders[0].name, "Development");
});

test("rapid actions are serialized against the last saved state with no lost updates", async () => {
  const storage = memoryStorage();
  const writes: string[] = [];
  const repository = new LayoutRepository({
    getItem: storage.getItem,
    setItem: async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      writes.push(value);
      await storage.setItem(key, value);
    },
  });
  await Promise.all([
    repository.update((s) => createFolder(s, "dev", "Development", null)),
    repository.update((s) => createFolder(s, "nested", "Editors", "dev")),
    repository.update((s) => renameFolder(s, "dev", "Work")),
  ]);
  assert.equal(writes.length, 3);
  assert.deepEqual(
    repository.getSnapshot().state.folders.map((f) => f.name),
    ["Work", "Editors"],
  );
  assert.deepEqual(decodeState(storage.values.get(STORAGE_KEY)).state, repository.getSnapshot().state);
});

test("write failures do not change the visible state or poison the queue", async () => {
  let fail = true;
  const storage = memoryStorage();
  const repository = new LayoutRepository({
    getItem: storage.getItem,
    setItem: async (key, value) => {
      if (fail) throw new Error("disk unavailable");
      await storage.setItem(key, value);
    },
  });
  await assert.rejects(
    repository.update((s) => createFolder(s, "bad", "Bad", null)),
    /disk unavailable/,
  );
  assert.equal(repository.getSnapshot().state.folders.length, 0);
  fail = false;
  await repository.update((s) => createFolder(s, "good", "Good", null));
  assert.deepEqual(
    repository.getSnapshot().state.folders.map((f) => f.id),
    ["good"],
  );
});

test("read and backup failures protect storage; retry can recover", async () => {
  let fail = true;
  const storage = memoryStorage();
  const repository = new LayoutRepository({
    getItem: async (key) => {
      if (fail) throw new Error("read failed");
      return storage.getItem(key);
    },
    setItem: storage.setItem,
  });
  await repository.load();
  assert.equal(repository.getSnapshot().status, "error");
  await assert.rejects(repository.update(emptyState));
  fail = false;
  await repository.retry();
  assert.equal(repository.getSnapshot().status, "ready");
  const damaged = new LayoutRepository({
    getItem: async () => "broken",
    setItem: async () => {
      throw new Error("backup failed");
    },
  });
  await damaged.load();
  assert.equal(damaged.getSnapshot().status, "error");
  await assert.rejects(damaged.update(emptyState), /backup failed/);
});
