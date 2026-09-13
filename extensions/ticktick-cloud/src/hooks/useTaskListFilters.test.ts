import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { Project } from "../domain/project";
import { SEARCH_FILTERS_STORAGE_KEY, type TaskFilterStoragePort } from "../platform/taskFilterPreferences";
import { inboxProject, workProject } from "../test/fixtures/tasks";

type Cleanup = () => void;
type Effect = () => void | Cleanup;
type Slot =
  | { kind: "state"; value: unknown }
  | { kind: "ref"; current: unknown }
  | { kind: "memo"; value: unknown; dependencies: readonly unknown[] }
  | { kind: "effect"; dependencies: readonly unknown[]; cleanup?: Cleanup };

class HookHarness {
  private slots: Slot[] = [];
  private cursor = 0;
  private pendingEffects: Array<{ index: number; effect: Effect; dependencies: readonly unknown[] }> = [];
  private unmounted = false;
  updatesAfterUnmount = 0;

  reset(): void {
    this.slots = [];
    this.cursor = 0;
    this.pendingEffects = [];
    this.unmounted = false;
    this.updatesAfterUnmount = 0;
  }

  render<T>(hook: () => T): T {
    const result = this.renderWithoutEffects(hook);
    this.flushEffects();
    return result;
  }

  renderWithoutEffects<T>(hook: () => T): T {
    this.cursor = 0;
    return hook();
  }

  unmount(): void {
    this.unmounted = true;
    for (const slot of this.slots) {
      if (slot.kind === "effect") slot.cleanup?.();
    }
  }

  useState<T>(initial: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void] {
    const index = this.cursor++;
    if (!this.slots[index]) {
      this.slots[index] = { kind: "state", value: typeof initial === "function" ? (initial as () => T)() : initial };
    }
    const slot = this.slots[index];
    if (slot.kind !== "state") throw new Error("Hook order changed");

    const setState = (value: T | ((previous: T) => T)) => {
      if (this.unmounted) {
        this.updatesAfterUnmount += 1;
        return;
      }
      const current = this.slots[index];
      if (current.kind !== "state") throw new Error("Hook order changed");
      const previous = current.value as T;
      current.value = typeof value === "function" ? (value as (previous: T) => T)(previous) : value;
    };

    return [slot.value as T, setState];
  }

  useRef<T>(initial: T): { current: T } {
    const index = this.cursor++;
    if (!this.slots[index]) this.slots[index] = { kind: "ref", current: initial };
    const slot = this.slots[index];
    if (slot.kind !== "ref") throw new Error("Hook order changed");
    return slot as { kind: "ref"; current: T };
  }

  useCallback<T extends (...args: never[]) => unknown>(callback: T, dependencies: readonly unknown[]): T {
    const index = this.cursor++;
    const existing = this.slots[index];
    if (!existing || existing.kind !== "memo" || !sameDependencies(existing.dependencies, dependencies)) {
      this.slots[index] = { kind: "memo", value: callback, dependencies };
      return callback;
    }
    return existing.value as T;
  }

  useEffect(effect: Effect, dependencies: readonly unknown[]): void {
    const index = this.cursor++;
    const existing = this.slots[index];
    if (!existing || existing.kind !== "effect" || !sameDependencies(existing.dependencies, dependencies)) {
      this.pendingEffects.push({ index, effect, dependencies });
      if (!existing) this.slots[index] = { kind: "effect", dependencies };
    }
  }

  flushEffects(): void {
    const pending = this.pendingEffects;
    this.pendingEffects = [];
    for (const { index, effect, dependencies } of pending) {
      const previous = this.slots[index];
      if (previous.kind === "effect") previous.cleanup?.();
      const cleanup = effect();
      this.slots[index] = { kind: "effect", dependencies, ...(cleanup ? { cleanup } : {}) };
    }
  }
}

function sameDependencies(left: readonly unknown[], right: readonly unknown[]): boolean {
  return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function settle(): Promise<void> {
  for (let index = 0; index < 15; index += 1) await Promise.resolve();
}

class StorageHarness implements TaskFilterStoragePort {
  readonly values = new Map<string, string>();
  readonly getCalls: string[] = [];
  readonly setCalls: Array<Readonly<{ key: string; value: string }>> = [];
  readonly removeCalls: string[] = [];
  getImpl?: (key: string) => Promise<string | undefined>;
  setImpl?: (key: string, value: string) => Promise<void>;

  async getItem(key: string): Promise<string | undefined> {
    this.getCalls.push(key);
    return this.getImpl ? this.getImpl(key) : this.values.get(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    this.setCalls.push({ key, value });
    if (this.setImpl) return this.setImpl(key, value);
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.removeCalls.push(key);
    this.values.delete(key);
  }
}

const closedWorkProject: Project = Object.freeze({ ...workProject, closed: true });

const harness = new HookHarness();
let useTaskListFilters: typeof import("./useTaskListFilters").useTaskListFilters;
let moduleTypes: typeof import("./useTaskListFilters");

beforeAll(async () => {
  vi.doMock("react", () => ({
    useState: <T>(initial: T | (() => T)) => harness.useState(initial),
    useRef: <T>(initial: T) => harness.useRef(initial),
    useCallback: <T extends (...args: never[]) => unknown>(callback: T, dependencies: readonly unknown[]) =>
      harness.useCallback(callback, dependencies),
    useEffect: (effect: Effect, dependencies: readonly unknown[]) => harness.useEffect(effect, dependencies),
  }));
  moduleTypes = await import("./useTaskListFilters");
  useTaskListFilters = moduleTypes.useTaskListFilters;
});

afterAll(() => {
  vi.doUnmock("react");
  vi.resetModules();
});

beforeEach(() => {
  harness.reset();
});

function options(
  overrides: Partial<import("./useTaskListFilters").UseTaskListFiltersOptions> = {}
): import("./useTaskListFilters").UseTaskListFiltersOptions {
  return {
    mode: "search",
    defaultStatus: "open",
    projects: [inboxProject, workProject],
    catalogAuthoritative: true,
    completedQuery: true,
    contextKey: "context-a",
    ...overrides,
  };
}

function statusValue(
  result: import("./useTaskListFilters").TaskListFilterState,
  status: "open" | "completed" | "all"
): string {
  return result.combinedFilter.statusOptions.find((option) => option.selection?.status === status)!.value;
}

function projectValue(result: import("./useTaskListFilters").TaskListFilterState, projectId: string): string {
  return result.combinedFilter.projectOptions.find((option) => option.selection?.projectId === projectId)!.value;
}

describe("useTaskListFilters contract", () => {
  it("exposes the backend-neutral state contract", () => {
    expectTypeOf(moduleTypes.useTaskListFilters).toBeFunction();
    expectTypeOf<import("./useTaskListFilters").TaskListFilterMode>().toEqualTypeOf<"search" | "ephemeral">();
    expectTypeOf<import("./useTaskListFilters").TaskListFilterState>().toMatchTypeOf<{
      filters: Readonly<{ searchText: string; projectId?: string; status: "open" | "completed" | "all" }>;
      filtersReady: boolean;
      combinedFilter: Readonly<{ summary: string }>;
      setSearchText(value: string): void;
      selectCombinedFilter(value: string): void;
    }>();
  });

  it("is immediately ready in ephemeral mode and never touches injected storage", async () => {
    const storage = new StorageHarness();
    storage.getImpl = async () => {
      throw new Error("PRIVATE-MARKER-ephemeral-read");
    };
    storage.setImpl = async () => {
      throw new Error("PRIVATE-MARKER-ephemeral-write");
    };

    let result = harness.render(() =>
      useTaskListFilters(options({ mode: "ephemeral", storage, defaultStatus: "open" }))
    );
    expect(result.filtersReady).toBe(true);
    expect(result.filters).toEqual({ searchText: "", status: "open" });

    result.setSearchText("local only");
    result.selectCombinedFilter(statusValue(result, "completed"));
    result = harness.render(() => useTaskListFilters(options({ mode: "ephemeral", storage, defaultStatus: "open" })));
    await settle();

    expect(result.filters).toEqual({ searchText: "local only", status: "completed" });
    expect(storage.getCalls).toEqual([]);
    expect(storage.setCalls).toEqual([]);
  });

  it("starts Search at safe Open/All and preserves locally typed text while deferred preferences hydrate", async () => {
    const storage = new StorageHarness();
    const read = deferred<string | undefined>();
    storage.getImpl = async (key) => (key === SEARCH_FILTERS_STORAGE_KEY ? read.promise : undefined);
    const input = options({ storage });

    let result = harness.render(() => useTaskListFilters(input));
    expect(result.filtersReady).toBe(false);
    expect(result.filters).toEqual({ searchText: "", status: "open" });

    result.setSearchText("private local search");
    result = harness.render(() => useTaskListFilters(input));
    expect(result.filters).toEqual({ searchText: "private local search", status: "open" });

    read.resolve('{"status":"completed","projectId":"project-work"}');
    await settle();
    result = harness.render(() => useTaskListFilters(input));

    expect(result.filtersReady).toBe(true);
    expect(result.filters).toEqual({
      searchText: "private local search",
      status: "completed",
      projectId: workProject.id,
    });
    expect(storage.setCalls).toEqual([]);
  });

  it("preserves initial-mount text and selection accepted before passive effects flush", async () => {
    const storage = new StorageHarness();
    const read = deferred<string | undefined>();
    storage.getImpl = async (key) => (key === SEARCH_FILTERS_STORAGE_KEY ? read.promise : undefined);
    const input = options({ storage, contextKey: "pre-effect-initial" });

    let result = harness.renderWithoutEffects(() => useTaskListFilters(input));
    result.setSearchText("typed before initial effect");
    result.selectCombinedFilter(statusValue(result, "completed"));
    harness.flushEffects();
    result = harness.renderWithoutEffects(() => useTaskListFilters(input));

    expect(result.filters).toEqual({ searchText: "typed before initial effect", status: "completed" });
    expect(result.filtersReady).toBe(false);

    read.resolve('{"status":"open"}');
    await settle();
    result = harness.render(() => useTaskListFilters(input));
    expect(result.filters).toEqual({ searchText: "typed before initial effect", status: "completed" });
    expect(result.filtersReady).toBe(true);
  });

  it("lets a selection made before load completion win over the loaded value", async () => {
    const storage = new StorageHarness();
    const read = deferred<string | undefined>();
    storage.getImpl = async (key) => (key === SEARCH_FILTERS_STORAGE_KEY ? read.promise : undefined);
    const input = options({ storage });

    let result = harness.render(() => useTaskListFilters(input));
    result.selectCombinedFilter(statusValue(result, "all"));
    result = harness.render(() => useTaskListFilters(input));
    expect(result.filters).toEqual({ searchText: "", status: "all" });

    read.resolve('{"status":"open","projectId":"project-inbox"}');
    await settle();
    result = harness.render(() => useTaskListFilters(input));

    expect(result.filtersReady).toBe(true);
    expect(result.filters).toEqual({ searchText: "", status: "all" });
    expect(storage.setCalls.at(-1)).toEqual({
      key: SEARCH_FILTERS_STORAGE_KEY,
      value: '{"status":"all"}',
    });
  });

  it("applies rapid status and project selections without losing either dimension and persists last-request last", async () => {
    const storage = new StorageHarness();
    storage.values.set(SEARCH_FILTERS_STORAGE_KEY, '{"status":"open"}');
    const firstWrite = deferred<void>();
    const secondWrite = deferred<void>();
    let writeIndex = 0;
    storage.setImpl = async (key, value) => {
      await [firstWrite, secondWrite][writeIndex++].promise;
      storage.values.set(key, value);
    };
    const input = options({ storage });

    harness.render(() => useTaskListFilters(input));
    await settle();
    let result = harness.render(() => useTaskListFilters(input));
    const completed = statusValue(result, "completed");
    const work = projectValue(result, workProject.id);

    result.selectCombinedFilter(completed);
    result.selectCombinedFilter(work);
    result = harness.render(() => useTaskListFilters(input));

    expect(result.filters).toEqual({ searchText: "", status: "completed", projectId: workProject.id });
    await vi.waitFor(() => expect(storage.setCalls).toHaveLength(1));
    firstWrite.resolve();
    await vi.waitFor(() => expect(storage.setCalls).toHaveLength(2));
    secondWrite.resolve();
    await settle();

    expect(storage.values.get(SEARCH_FILTERS_STORAGE_KEY)).toBe('{"status":"completed","projectId":"project-work"}');
    expect(storage.setCalls.map((call) => call.value)).toEqual([
      '{"status":"completed"}',
      '{"status":"completed","projectId":"project-work"}',
    ]);
  });

  it("ignores deferred hydration and stale callbacks after unmount", async () => {
    const storage = new StorageHarness();
    const read = deferred<string | undefined>();
    storage.getImpl = async (key) => (key === SEARCH_FILTERS_STORAGE_KEY ? read.promise : undefined);
    const input = options({ storage });
    const result = harness.render(() => useTaskListFilters(input));

    harness.unmount();
    result.setSearchText("must not apply");
    result.selectCombinedFilter(statusValue(result, "completed"));
    read.resolve('{"status":"completed","projectId":"project-work"}');
    await settle();

    expect(harness.updatesAfterUnmount).toBe(0);
    expect(storage.setCalls).toEqual([]);
  });

  it("resets private search text on context change and ignores the old load and callbacks", async () => {
    const storage = new StorageHarness();
    const firstRead = deferred<string | undefined>();
    const secondRead = deferred<string | undefined>();
    let readIndex = 0;
    storage.getImpl = async (key) => {
      if (key !== SEARCH_FILTERS_STORAGE_KEY) return undefined;
      return [firstRead, secondRead][readIndex++].promise;
    };
    const firstInput = options({ storage, contextKey: "context-private-a" });
    const secondInput = options({ storage, contextKey: "context-private-b" });

    let oldResult = harness.render(() => useTaskListFilters(firstInput));
    oldResult.setSearchText("private context A search");
    oldResult = harness.render(() => useTaskListFilters(firstInput));
    expect(oldResult.filters.searchText).toBe("private context A search");

    let result = harness.render(() => useTaskListFilters(secondInput));
    expect(result.filters).toEqual({ searchText: "", status: "open" });
    expect(result.filtersReady).toBe(false);
    oldResult.setSearchText("late old text");
    oldResult.selectCombinedFilter(statusValue(oldResult, "completed"));

    firstRead.resolve('{"status":"completed","projectId":"project-work"}');
    await settle();
    result = harness.render(() => useTaskListFilters(secondInput));
    expect(result.filters).toEqual({ searchText: "", status: "open" });
    expect(storage.setCalls).toEqual([]);

    secondRead.resolve('{"status":"open","projectId":"project-inbox"}');
    await settle();
    result = harness.render(() => useTaskListFilters(secondInput));
    expect(result.filtersReady).toBe(true);
    expect(result.filters).toEqual({ searchText: "", status: "open", projectId: inboxProject.id });
  });

  it("resets the old context synchronously but preserves new-context interactions before its effect flush", () => {
    const firstInput = options({ storage: undefined, contextKey: "pre-effect-context-a" });
    const secondInput = options({ storage: undefined, contextKey: "pre-effect-context-b" });

    let result = harness.render(() => useTaskListFilters(firstInput));
    result.setSearchText("private old-context text");
    result.selectCombinedFilter(statusValue(result, "completed"));
    result = harness.render(() => useTaskListFilters(firstInput));
    expect(result.filters).toEqual({ searchText: "private old-context text", status: "completed" });

    result = harness.renderWithoutEffects(() => useTaskListFilters(secondInput));
    expect(result.filters).toEqual({ searchText: "", status: "open" });
    result.setSearchText("new-context text before effect");
    result.selectCombinedFilter(statusValue(result, "all"));
    harness.flushEffects();
    result = harness.render(() => useTaskListFilters(secondInput));

    expect(result.filters).toEqual({ searchText: "new-context text before effect", status: "all" });
    expect(result.filtersReady).toBe(true);
  });

  it("preserves an unknown project while the catalog is non-authoritative, then canonicalizes and persists once", async () => {
    const storage = new StorageHarness();
    storage.values.set(SEARCH_FILTERS_STORAGE_KEY, '{"status":"completed","projectId":"remembered-missing-project"}');
    const loadingCatalog = options({
      storage,
      projects: [],
      catalogAuthoritative: false,
      contextKey: "catalog-context",
    });

    harness.render(() => useTaskListFilters(loadingCatalog));
    await settle();
    let result = harness.render(() => useTaskListFilters(loadingCatalog));

    expect(result.filters).toEqual({
      searchText: "",
      status: "completed",
      projectId: "remembered-missing-project",
    });
    expect(result.combinedFilter.summary).toBe("Completed · Selected List");
    expect(storage.setCalls).toEqual([]);

    const authoritative = { ...loadingCatalog, catalogAuthoritative: true };
    result = harness.render(() => useTaskListFilters(authoritative));
    await settle();
    result = harness.render(() => useTaskListFilters(authoritative));

    expect(result.filters).toEqual({ searchText: "", status: "completed" });
    expect(storage.setCalls).toEqual([{ key: SEARCH_FILTERS_STORAGE_KEY, value: '{"status":"completed"}' }]);
    harness.render(() => useTaskListFilters(authoritative));
    await settle();
    expect(storage.setCalls).toHaveLength(1);
  });

  it("canonicalizes a remembered closed project only after the catalog is authoritative", async () => {
    const storage = new StorageHarness();
    storage.values.set(SEARCH_FILTERS_STORAGE_KEY, '{"status":"open","projectId":"project-work"}');
    const pending = options({ storage, projects: [closedWorkProject], catalogAuthoritative: false });

    harness.render(() => useTaskListFilters(pending));
    await settle();
    let result = harness.render(() => useTaskListFilters(pending));
    expect(result.filters.projectId).toBe(workProject.id);

    result = harness.render(() => useTaskListFilters({ ...pending, catalogAuthoritative: true }));
    await settle();
    result = harness.render(() => useTaskListFilters({ ...pending, catalogAuthoritative: true }));
    expect(result.filters.projectId).toBeUndefined();
    expect(storage.setCalls.at(-1)?.value).toBe('{"status":"open"}');
  });

  it("preserves a remembered completed status until an open-only catalog is authoritative", async () => {
    const storage = new StorageHarness();
    storage.values.set(SEARCH_FILTERS_STORAGE_KEY, '{"status":"all","projectId":"project-work"}');
    const pending = options({ storage, completedQuery: false, catalogAuthoritative: false });

    harness.render(() => useTaskListFilters(pending));
    await settle();
    let result = harness.render(() => useTaskListFilters(pending));
    expect(result.filters).toEqual({ searchText: "", status: "all", projectId: workProject.id });

    const authoritative = { ...pending, catalogAuthoritative: true };
    result = harness.render(() => useTaskListFilters(authoritative));
    await settle();
    result = harness.render(() => useTaskListFilters(authoritative));
    expect(result.filters).toEqual({ searchText: "", status: "open", projectId: workProject.id });
    expect(result.combinedFilter.statusOptions.map((option) => option.title)).toEqual(["Open"]);
    expect(storage.setCalls.at(-1)?.value).toBe('{"status":"open","projectId":"project-work"}');
  });

  it("keeps safe in-memory state when storage reads and writes fail", async () => {
    const storage = new StorageHarness();
    storage.getImpl = async () => {
      throw new Error("PRIVATE-MARKER-read-error");
    };
    storage.setImpl = async () => {
      throw new Error("PRIVATE-MARKER-write-error");
    };
    const input = options({ storage });

    harness.render(() => useTaskListFilters(input));
    await settle();
    let result = harness.render(() => useTaskListFilters(input));
    expect(result.filtersReady).toBe(true);
    expect(result.filters).toEqual({ searchText: "", status: "open" });

    result.selectCombinedFilter(statusValue(result, "completed"));
    result = harness.render(() => useTaskListFilters(input));
    await settle();
    expect(result.filters.status).toBe("completed");
  });

  it("never persists search text, project names, context keys, task data, or caller mutations", async () => {
    const marker = "PRIVATE-MARKER-hook-filter";
    const storage = new StorageHarness();
    storage.values.set(SEARCH_FILTERS_STORAGE_KEY, '{"status":"open"}');
    const projects = Object.freeze([
      Object.freeze({ ...inboxProject, name: marker }),
      Object.freeze({ ...workProject, name: marker }),
    ]);
    const input = Object.freeze(
      options({ storage, projects, contextKey: `${marker}-account-key` })
    ) as import("./useTaskListFilters").UseTaskListFiltersOptions;

    harness.render(() => useTaskListFilters(input));
    await settle();
    let result = harness.render(() => useTaskListFilters(input));
    result.setSearchText(`${marker}-search-task-error`);
    result.selectCombinedFilter(projectValue(result, workProject.id));
    result = harness.render(() => useTaskListFilters(input));
    await settle();

    expect(result.filters.searchText).toContain(marker);
    expect(storage.setCalls).toHaveLength(1);
    expect(storage.setCalls[0].value).toBe('{"status":"open","projectId":"project-work"}');
    expect(JSON.stringify(storage.setCalls)).not.toContain(marker);
    expect(input.projects).toBe(projects);
    expect(Object.isFrozen(input)).toBe(true);
    expect(Object.isFrozen(projects)).toBe(true);
  });

  it("has no Raycast, LocalStorage, backend, concrete runtime, or network dependency", () => {
    const source = readFileSync(resolve(__dirname, "useTaskListFilters.ts"), "utf8");

    expect(source).not.toMatch(/@raycast|LocalStorage|TickTickBackend|TickTickService|fetch\s*\(|ActionPanel/);
    expect(source).not.toMatch(/infrastructure\/(?:mcp|openapi|macos)|BackendFactory/);
  });
});
