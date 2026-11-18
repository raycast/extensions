import test from "node:test";
import assert from "node:assert/strict";
import {
  clearMenuBarCache,
  readMenuBarCache,
  writeMenuBarCache,
  type MenuBarCacheStore,
} from "../src/lib/menu-bar-cache";
import { refreshMenuBarState } from "../src/lib/menu-bar-state";
import type { TaskRecord } from "../src/lib/types";

test("writes successful menu bar refreshes to cache", async () => {
  const cacheStore = createCacheStore();

  const state = await refreshMenuBarState({
    repository: {
      listTasks: async () => [createTask({ id: "task-1", header: "Ship", dueDate: "2026-04-10" })],
    },
    cacheStore,
  });

  assert.equal(state.title, "Ship");
  assert.equal(readMenuBarCache(cacheStore)?.title, "Ship");
});

test("clears malformed cache entries while reading", () => {
  const cacheStore = createCacheStore({
    "menu-bar-state": "{not-json",
  });

  assert.equal(readMenuBarCache(cacheStore), undefined);
  assert.equal(cacheStore.get("menu-bar-state"), undefined);
});

test("failed refresh clears stale cached task data", async () => {
  const cacheStore = createCacheStore();
  writeMenuBarCache(
    {
      currentTask: createTask({ id: "stale", header: "Stale Task" }),
      menuTasks: [],
      title: "Stale Task",
      tooltip: "Old tooltip",
    },
    cacheStore,
  );

  const state = await refreshMenuBarState({
    repository: {
      listTasks: async () => {
        throw new Error("boom");
      },
    },
    cacheStore,
  });

  assert.equal(state.title, "Raylog Error");
  assert.equal(readMenuBarCache(cacheStore), undefined);
});

test("no-storage setup refresh clears cache and returns setup state", async () => {
  const cacheStore = createCacheStore();
  writeMenuBarCache(
    {
      currentTask: createTask({ id: "stale", header: "Stale Task" }),
      menuTasks: [],
      title: "Stale Task",
      tooltip: "Old tooltip",
    },
    cacheStore,
  );

  const state = await refreshMenuBarState({
    repository: undefined,
    cacheStore,
  });

  assert.equal(state.title, "Set Up Raylog - Markdown Tasks");
  assert.equal(readMenuBarCache(cacheStore), undefined);
});

test("clearMenuBarCache removes persisted state explicitly", () => {
  const cacheStore = createCacheStore();
  writeMenuBarCache(
    {
      currentTask: undefined,
      menuTasks: [],
      title: "Raylog - Markdown Tasks",
      tooltip: "Tooltip",
    },
    cacheStore,
  );

  clearMenuBarCache(cacheStore);

  assert.equal(readMenuBarCache(cacheStore), undefined);
});

function createCacheStore(initialValues: Record<string, string> = {}): MenuBarCacheStore {
  const values = new Map(Object.entries(initialValues));

  return {
    get(key) {
      return values.get(key);
    },
    set(key, value) {
      values.set(key, value);
    },
    remove(key) {
      values.delete(key);
    },
  };
}

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: overrides.id ?? "task-id",
    header: overrides.header ?? "Task",
    body: overrides.body ?? "",
    workLogs: overrides.workLogs ?? [],
    status: overrides.status ?? "todo",
    dueDate: overrides.dueDate ?? null,
    startDate: overrides.startDate ?? null,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-04-03T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-03T00:00:00.000Z",
  };
}
