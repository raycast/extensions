import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  LEGACY_SEARCH_PROJECT_FILTER_KEY,
  SEARCH_FILTERS_STORAGE_KEY,
  TaskFilterPreferenceStore,
  loadSearchFilters,
  parseSearchFilters,
  serializeSearchFilters,
  type PersistedSearchFilters,
  type TaskFilterStoragePort,
} from "./taskFilterPreferences";

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}>;

function deferred<T>(): Deferred<T> {
  let resolvePromise!: (value: T | PromiseLike<T>) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

class StorageHarness implements TaskFilterStoragePort {
  readonly values = new Map<string, string>();
  readonly getCalls: string[] = [];
  readonly setCalls: Array<Readonly<{ key: string; value: string }>> = [];
  readonly removeCalls: string[] = [];

  getImpl?: (key: string) => Promise<string | undefined>;
  setImpl?: (key: string, value: string) => Promise<void>;
  removeImpl?: (key: string) => Promise<void>;

  async getItem(key: string): Promise<string | undefined> {
    this.getCalls.push(key);
    if (this.getImpl) return this.getImpl(key);
    return this.values.get(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    this.setCalls.push({ key, value });
    if (this.setImpl) return this.setImpl(key, value);
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.removeCalls.push(key);
    if (this.removeImpl) return this.removeImpl(key);
    this.values.delete(key);
  }
}

function filters(status: PersistedSearchFilters["status"], projectId?: string): PersistedSearchFilters {
  return projectId === undefined ? { status } : { status, projectId };
}

describe("task-filter serialization", () => {
  it("exports stable storage keys and a narrow storage port", () => {
    expect(SEARCH_FILTERS_STORAGE_KEY).toBe("ticktick.searchFilters.v1");
    expect(LEGACY_SEARCH_PROJECT_FILTER_KEY).toBe("searchProjectFilter");
    expectTypeOf<TaskFilterStoragePort>().toMatchTypeOf<{
      getItem(key: string): Promise<string | undefined>;
      setItem(key: string, value: string): Promise<void>;
      removeItem(key: string): Promise<void>;
    }>();
  });

  it.each(["open", "completed", "all"] as const)("round-trips the %s status with an opaque project ID", (status) => {
    const projectId = "opaque:/project β 42";
    const serialized = serializeSearchFilters(filters(status, projectId));

    expect(JSON.parse(serialized)).toEqual({ status, projectId });
    expect(parseSearchFilters(serialized)).toEqual({ status, projectId });
  });

  it("persists only status and optional projectId in a stable atomic object", () => {
    const marker = "PRIVATE-MARKER-filter-payload";
    const input = Object.freeze({
      status: "completed",
      projectId: "project-id",
      searchText: marker,
      projectName: marker,
      task: { title: marker },
      account: marker,
      error: new Error(marker),
    }) as unknown as PersistedSearchFilters;

    const serialized = serializeSearchFilters(input);

    expect(serialized).toBe('{"status":"completed","projectId":"project-id"}');
    expect(Object.keys(JSON.parse(serialized))).toEqual(["status", "projectId"]);
    expect(serialized).not.toContain(marker);
    expect(input).toHaveProperty("searchText", marker);
  });

  it("ignores extra and private parsed fields without reflecting them into the result", () => {
    const marker = "PRIVATE-MARKER-parsed-filter";
    const parsed = parseSearchFilters(
      JSON.stringify({
        status: "all",
        projectId: "project-id",
        searchText: marker,
        projectName: marker,
        taskContent: marker,
        accountId: marker,
        error: marker,
        nested: { marker },
      })
    );

    expect(parsed).toEqual({ status: "all", projectId: "project-id" });
    expect(Object.keys(parsed)).toEqual(["status", "projectId"]);
    expect(JSON.stringify(parsed)).not.toContain(marker);
  });

  it.each([
    undefined,
    null,
    "",
    "not-json",
    "[]",
    "null",
    "{}",
    '{"status":"pending"}',
    '{"status":1}',
    '{"status":"open","projectId":null}',
    '{"status":"open","projectId":42}',
    '{"status":"open","projectId":""}',
    '{"status":"open","projectId":"   "}',
    JSON.stringify({ status: "open", projectId: "project\u0000id" }),
    JSON.stringify({ status: "completed", projectId: "project\u0085id" }),
    JSON.stringify({ status: "all", projectId: "project\u202eid" }),
    JSON.stringify({ status: "open", projectId: "project\ud800id" }),
  ])("fails a malformed payload closed to Open and All projects: %#", (raw) => {
    const parsed = parseSearchFilters(raw);

    expect(parsed).toEqual({ status: "open" });
    expect(Object.isFrozen(parsed)).toBe(true);
  });

  it("snapshots untrusted status and project accessors exactly once before validation and use", () => {
    const marker = "PRIVATE-MARKER-changing-getter";
    let statusReads = 0;
    let projectReads = 0;
    const changing = Object.defineProperties(
      {},
      {
        status: {
          enumerable: true,
          get() {
            statusReads += 1;
            if (statusReads > 1) throw new Error(marker);
            return "completed";
          },
        },
        projectId: {
          enumerable: true,
          get() {
            projectReads += 1;
            return projectReads === 1 ? "safe-project" : `${marker}\u0000`;
          },
        },
      }
    ) as PersistedSearchFilters;

    const serialized = serializeSearchFilters(changing);

    expect(serialized).toBe('{"status":"completed","projectId":"safe-project"}');
    expect(serialized).not.toContain(marker);
    expect(statusReads).toBe(1);
    expect(projectReads).toBe(1);
  });

  it.each(["status", "projectId"] as const)(
    "fails a throwing %s accessor closed without exposing its raw error",
    (throwingProperty) => {
      const marker = `PRIVATE-MARKER-${throwingProperty}-getter`;
      const malformed = Object.defineProperties(
        {},
        {
          status: {
            enumerable: true,
            get() {
              if (throwingProperty === "status") throw new Error(marker);
              return "open";
            },
          },
          projectId: {
            enumerable: true,
            get() {
              if (throwingProperty === "projectId") throw new Error(marker);
              return "project-id";
            },
          },
        }
      ) as PersistedSearchFilters;

      let serialized = "";
      expect(() => {
        serialized = serializeSearchFilters(malformed);
      }).not.toThrow();
      expect(serialized).toBe('{"status":"open"}');
      expect(serialized).not.toContain(marker);
    }
  );

  it("serializes an invalid runtime-cast status as the safe default", () => {
    expect(serializeSearchFilters({ status: "invalid" } as unknown as PersistedSearchFilters)).toBe(
      '{"status":"open"}'
    );
  });

  it("returns fresh frozen values and never mutates caller input", () => {
    const input = Object.freeze({ status: "completed" as const, projectId: "project-id" });
    const before = JSON.stringify(input);
    const first = parseSearchFilters(serializeSearchFilters(input));
    const second = parseSearchFilters(serializeSearchFilters(input));

    expect(first).toEqual(input);
    expect(first).not.toBe(input);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe("loading and legacy migration", () => {
  it("uses a valid atomic value without reading or mutating legacy storage", async () => {
    const storage = new StorageHarness();
    storage.values.set(SEARCH_FILTERS_STORAGE_KEY, '{"status":"completed","projectId":"atomic-project"}');
    storage.values.set(LEGACY_SEARCH_PROJECT_FILTER_KEY, "legacy-project");

    await expect(loadSearchFilters(storage)).resolves.toEqual({
      status: "completed",
      projectId: "atomic-project",
    });
    expect(storage.getCalls).toEqual([SEARCH_FILTERS_STORAGE_KEY]);
    expect(storage.setCalls).toEqual([]);
    expect(storage.removeCalls).toEqual([]);
  });

  it("does not let a present but invalid atomic value fall back to legacy state", async () => {
    const storage = new StorageHarness();
    storage.values.set(SEARCH_FILTERS_STORAGE_KEY, '{"status":"invalid"}');
    storage.values.set(LEGACY_SEARCH_PROJECT_FILTER_KEY, "legacy-project");

    await expect(loadSearchFilters(storage)).resolves.toEqual({ status: "open" });
    expect(storage.getCalls).toEqual([SEARCH_FILTERS_STORAGE_KEY]);
    expect(storage.setCalls).toEqual([]);
    expect(storage.removeCalls).toEqual([]);
  });

  it("migrates a valid legacy project with Open status and removes legacy only after the atomic write", async () => {
    const storage = new StorageHarness();
    const events: string[] = [];
    storage.values.set(LEGACY_SEARCH_PROJECT_FILTER_KEY, "legacy-project");
    storage.setImpl = async (key, value) => {
      events.push(`set:${key}`);
      storage.values.set(key, value);
    };
    storage.removeImpl = async (key) => {
      events.push(`remove:${key}`);
      storage.values.delete(key);
    };

    await expect(loadSearchFilters(storage)).resolves.toEqual({ status: "open", projectId: "legacy-project" });
    expect(storage.getCalls).toEqual([SEARCH_FILTERS_STORAGE_KEY, LEGACY_SEARCH_PROJECT_FILTER_KEY]);
    expect(storage.setCalls).toEqual([
      { key: SEARCH_FILTERS_STORAGE_KEY, value: '{"status":"open","projectId":"legacy-project"}' },
    ]);
    expect(events).toEqual([`set:${SEARCH_FILTERS_STORAGE_KEY}`, `remove:${LEGACY_SEARCH_PROJECT_FILTER_KEY}`]);
  });

  it("migrates the legacy All sentinel to the safe Open/All default", async () => {
    const storage = new StorageHarness();
    storage.values.set(LEGACY_SEARCH_PROJECT_FILTER_KEY, "all");

    await expect(loadSearchFilters(storage)).resolves.toEqual({ status: "open" });
    expect(storage.setCalls).toEqual([{ key: SEARCH_FILTERS_STORAGE_KEY, value: '{"status":"open"}' }]);
    expect(storage.removeCalls).toEqual([LEGACY_SEARCH_PROJECT_FILTER_KEY]);
  });

  it.each(["", "   ", "bad\u0000project", "bad\u202eproject"])(
    "does not migrate an invalid legacy project ID: %#",
    async (legacyValue) => {
      const storage = new StorageHarness();
      storage.values.set(LEGACY_SEARCH_PROJECT_FILTER_KEY, legacyValue);

      await expect(loadSearchFilters(storage)).resolves.toEqual({ status: "open" });
      expect(storage.setCalls).toEqual([]);
      expect(storage.removeCalls).toEqual([]);
    }
  );

  it("keeps the valid legacy in-memory value but never removes it when the atomic migration write fails", async () => {
    const storage = new StorageHarness();
    storage.values.set(LEGACY_SEARCH_PROJECT_FILTER_KEY, "legacy-project");
    storage.setImpl = async () => {
      throw new Error("PRIVATE-MARKER-write-failure");
    };

    await expect(loadSearchFilters(storage)).resolves.toEqual({ status: "open", projectId: "legacy-project" });
    expect(storage.removeCalls).toEqual([]);
    expect(storage.values.get(LEGACY_SEARCH_PROJECT_FILTER_KEY)).toBe("legacy-project");
  });

  it("keeps the migrated value and atomic write when legacy removal fails", async () => {
    const storage = new StorageHarness();
    storage.values.set(LEGACY_SEARCH_PROJECT_FILTER_KEY, "legacy-project");
    storage.removeImpl = async () => {
      throw new Error("PRIVATE-MARKER-remove-failure");
    };

    await expect(loadSearchFilters(storage)).resolves.toEqual({ status: "open", projectId: "legacy-project" });
    expect(storage.values.get(SEARCH_FILTERS_STORAGE_KEY)).toBe('{"status":"open","projectId":"legacy-project"}');
    expect(storage.removeCalls).toEqual([LEGACY_SEARCH_PROJECT_FILTER_KEY]);
  });

  it("returns safe defaults without exposing atomic or legacy read failures", async () => {
    const atomicFailure = new StorageHarness();
    atomicFailure.getImpl = async () => {
      throw new Error("PRIVATE-MARKER-atomic-read");
    };
    await expect(loadSearchFilters(atomicFailure)).resolves.toEqual({ status: "open" });
    expect(atomicFailure.getCalls).toEqual([SEARCH_FILTERS_STORAGE_KEY]);

    const legacyFailure = new StorageHarness();
    legacyFailure.getImpl = async (key) => {
      if (key === LEGACY_SEARCH_PROJECT_FILTER_KEY) throw new Error("PRIVATE-MARKER-legacy-read");
      return undefined;
    };
    await expect(loadSearchFilters(legacyFailure)).resolves.toEqual({ status: "open" });
    expect(legacyFailure.getCalls).toEqual([SEARCH_FILTERS_STORAGE_KEY, LEGACY_SEARCH_PROJECT_FILTER_KEY]);
  });
});

describe("TaskFilterPreferenceStore", () => {
  it("starts with a frozen Open/All value and persists only the safe atomic shape", async () => {
    const storage = new StorageHarness();
    const store = new TaskFilterPreferenceStore(storage);
    const input = Object.freeze({ status: "completed" as const, projectId: "project-id" });

    expect(store.value).toEqual({ status: "open" });
    expect(Object.isFrozen(store.value)).toBe(true);
    await expect(store.write(input)).resolves.toBeUndefined();

    expect(store.value).toEqual(input);
    expect(store.value).not.toBe(input);
    expect(storage.setCalls).toEqual([
      { key: SEARCH_FILTERS_STORAGE_KEY, value: '{"status":"completed","projectId":"project-id"}' },
    ]);
    expect(input).toEqual({ status: "completed", projectId: "project-id" });
  });

  it("serializes deferred rapid writes so the last requested selection is persisted last", async () => {
    const storage = new StorageHarness();
    const firstGate = deferred<void>();
    const secondGate = deferred<void>();
    let writeIndex = 0;
    storage.setImpl = async (key, value) => {
      const index = writeIndex;
      writeIndex += 1;
      await [firstGate, secondGate][index].promise;
      storage.values.set(key, value);
    };
    const store = new TaskFilterPreferenceStore(storage);

    const firstWrite = store.write({ status: "completed", projectId: "first-project" });
    const secondWrite = store.write({ status: "all", projectId: "last-project" });

    await vi.waitFor(() => expect(storage.setCalls).toHaveLength(1));
    expect(store.value).toEqual({ status: "all", projectId: "last-project" });
    expect(storage.setCalls[0]).toEqual({
      key: SEARCH_FILTERS_STORAGE_KEY,
      value: '{"status":"completed","projectId":"first-project"}',
    });

    firstGate.resolve();
    await firstWrite;
    await vi.waitFor(() => expect(storage.setCalls).toHaveLength(2));
    expect(storage.values.get(SEARCH_FILTERS_STORAGE_KEY)).toBe('{"status":"completed","projectId":"first-project"}');

    secondGate.resolve();
    await secondWrite;
    expect(storage.values.get(SEARCH_FILTERS_STORAGE_KEY)).toBe('{"status":"all","projectId":"last-project"}');
  });

  it("continues the write queue after a storage rejection without exposing the raw error", async () => {
    const storage = new StorageHarness();
    let attempts = 0;
    storage.setImpl = async (key, value) => {
      attempts += 1;
      if (attempts === 1) throw new Error("PRIVATE-MARKER-first-write");
      storage.values.set(key, value);
    };
    const store = new TaskFilterPreferenceStore(storage);

    const first = store.write({ status: "completed", projectId: "first-project" });
    const second = store.write({ status: "open", projectId: "last-project" });

    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    expect(storage.setCalls).toHaveLength(2);
    expect(store.value).toEqual({ status: "open", projectId: "last-project" });
    expect(storage.values.get(SEARCH_FILTERS_STORAGE_KEY)).toBe('{"status":"open","projectId":"last-project"}');
  });

  it("captures a safe snapshot synchronously without mutating or later rereading caller input", async () => {
    const storage = new StorageHarness();
    const gate = deferred<void>();
    storage.setImpl = async (key, value) => {
      await gate.promise;
      storage.values.set(key, value);
    };
    const store = new TaskFilterPreferenceStore(storage);
    const input: { status: "completed"; projectId: string } = { status: "completed", projectId: "original" };

    const writing = store.write(input);
    input.projectId = "changed-after-request";
    gate.resolve();
    await writing;

    expect(storage.values.get(SEARCH_FILTERS_STORAGE_KEY)).toBe('{"status":"completed","projectId":"original"}');
    expect(input.projectId).toBe("changed-after-request");
  });

  it("does not let a stale deferred load overwrite a newer in-memory selection", async () => {
    const storage = new StorageHarness();
    const readGate = deferred<string | undefined>();
    storage.getImpl = async (key) => {
      if (key === SEARCH_FILTERS_STORAGE_KEY) return readGate.promise;
      return undefined;
    };
    const store = new TaskFilterPreferenceStore(storage);

    const loading = store.load();
    await vi.waitFor(() => expect(storage.getCalls).toEqual([SEARCH_FILTERS_STORAGE_KEY]));
    const writing = store.write({ status: "all", projectId: "new-project" });
    expect(store.value).toEqual({ status: "all", projectId: "new-project" });
    expect(storage.setCalls).toEqual([]);
    readGate.resolve('{"status":"completed","projectId":"stale-project"}');

    await expect(Promise.all([loading, writing])).resolves.toEqual([
      { status: "all", projectId: "new-project" },
      undefined,
    ]);
    expect(store.value).toEqual({ status: "all", projectId: "new-project" });
    expect(storage.values.get(SEARCH_FILTERS_STORAGE_KEY)).toBe('{"status":"all","projectId":"new-project"}');
  });

  it("queues the full legacy migration ahead of a user write requested after load begins", async () => {
    const storage = new StorageHarness();
    const atomicRead = deferred<string | undefined>();
    const events: string[] = [];
    storage.values.set(LEGACY_SEARCH_PROJECT_FILTER_KEY, "legacy-project");
    storage.getImpl = async (key) => {
      events.push(`get:${key}`);
      if (key === SEARCH_FILTERS_STORAGE_KEY) return atomicRead.promise;
      return storage.values.get(key);
    };
    storage.setImpl = async (key, value) => {
      events.push(`set:${value}`);
      storage.values.set(key, value);
    };
    storage.removeImpl = async (key) => {
      events.push(`remove:${key}`);
      storage.values.delete(key);
    };
    const store = new TaskFilterPreferenceStore(storage);

    const loading = store.load();
    await vi.waitFor(() => expect(storage.getCalls).toEqual([SEARCH_FILTERS_STORAGE_KEY]));
    const writing = store.write({ status: "all", projectId: "newer-user-project" });

    await Promise.resolve();
    expect(storage.setCalls).toEqual([]);
    expect(store.value).toEqual({ status: "all", projectId: "newer-user-project" });

    atomicRead.resolve(undefined);
    await expect(Promise.all([loading, writing])).resolves.toEqual([
      { status: "all", projectId: "newer-user-project" },
      undefined,
    ]);

    expect(storage.setCalls).toEqual([
      { key: SEARCH_FILTERS_STORAGE_KEY, value: '{"status":"open","projectId":"legacy-project"}' },
      { key: SEARCH_FILTERS_STORAGE_KEY, value: '{"status":"all","projectId":"newer-user-project"}' },
    ]);
    expect(events).toEqual([
      `get:${SEARCH_FILTERS_STORAGE_KEY}`,
      `get:${LEGACY_SEARCH_PROJECT_FILTER_KEY}`,
      'set:{"status":"open","projectId":"legacy-project"}',
      `remove:${LEGACY_SEARCH_PROJECT_FILTER_KEY}`,
      'set:{"status":"all","projectId":"newer-user-project"}',
    ]);
    expect(store.value).toEqual({ status: "all", projectId: "newer-user-project" });
    expect(storage.values.get(SEARCH_FILTERS_STORAGE_KEY)).toBe('{"status":"all","projectId":"newer-user-project"}');
    expect(storage.values.has(LEGACY_SEARCH_PROJECT_FILTER_KEY)).toBe(false);
  });

  it("does not let load or write failures poison later operations in the shared queue", async () => {
    const storage = new StorageHarness();
    let atomicReads = 0;
    let writes = 0;
    storage.getImpl = async (key) => {
      if (key !== SEARCH_FILTERS_STORAGE_KEY) return undefined;
      atomicReads += 1;
      if (atomicReads === 1) throw new Error("PRIVATE-MARKER-load-failure");
      return storage.values.get(key);
    };
    storage.setImpl = async (key, value) => {
      writes += 1;
      if (writes === 1) throw new Error("PRIVATE-MARKER-write-failure");
      storage.values.set(key, value);
    };
    const store = new TaskFilterPreferenceStore(storage);

    const failedLoad = store.load();
    const failedWrite = store.write({ status: "completed", projectId: "failed-project" });
    const finalWrite = store.write({ status: "open", projectId: "final-project" });

    await expect(Promise.all([failedLoad, failedWrite, finalWrite])).resolves.toEqual([
      { status: "open", projectId: "final-project" },
      undefined,
      undefined,
    ]);
    await expect(store.load()).resolves.toEqual({ status: "open", projectId: "final-project" });
    expect(storage.setCalls).toHaveLength(2);
    expect(storage.values.get(SEARCH_FILTERS_STORAGE_KEY)).toBe('{"status":"open","projectId":"final-project"}');
    expect(store.value).toEqual({ status: "open", projectId: "final-project" });
  });

  it("keeps malformed writes and all storage failures within safe defaults", async () => {
    const storage = new StorageHarness();
    storage.setImpl = async () => {
      throw new Error("PRIVATE-MARKER-write");
    };
    const store = new TaskFilterPreferenceStore(storage);

    await expect(store.write({ status: "invalid" } as unknown as PersistedSearchFilters)).resolves.toBeUndefined();
    expect(store.value).toEqual({ status: "open" });
    expect(storage.setCalls).toEqual([{ key: SEARCH_FILTERS_STORAGE_KEY, value: '{"status":"open"}' }]);
  });

  it("has no Raycast, backend, runtime, UI, or network dependency", () => {
    const source = readFileSync(resolve(__dirname, "taskFilterPreferences.ts"), "utf8");

    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/@raycast|LocalStorage|TickTickBackend|TickTickService|fetch\s*\(|ActionPanel|React/);
  });
});
