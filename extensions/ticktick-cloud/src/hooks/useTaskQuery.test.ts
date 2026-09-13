import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TickTickService, type TaskReadModel } from "../application/TickTickService";
import type { TaskViewQuery } from "../application/viewQuery";
import { ProtocolError } from "../domain/errors";
import type { TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { TaskRepository, type TaskCacheScope } from "../infrastructure/cache/TaskRepository";
import { InMemoryCachePort } from "../test/fakes/InMemoryCachePort";
import { inboxProject, taskFixture, workProject } from "../test/fixtures/tasks";

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
    this.cursor = 0;
    const result = hook();
    this.flushEffects();
    return result;
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

  private flushEffects(): void {
    const pending = this.pendingEffects;
    this.pendingEffects = [];
    for (const { index, effect, dependencies } of pending) {
      const previous = this.slots[index];
      if (previous.kind === "effect") previous.cleanup?.();
      const cleanup = effect();
      this.slots[index] = {
        kind: "effect",
        dependencies,
        ...(cleanup ? { cleanup } : {}),
      };
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
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}

const model = (id: string): TaskReadModel => ({
  projects: [inboxProject],
  tasks: [taskFixture({ id })],
  sections: [{ id: "search", title: "Tasks", tasks: [taskFixture({ id })] }],
  freshness: "fresh",
  fetchedAt: 1,
  isPartial: false,
  failedProjectIds: [],
});

const accountKey = "oauth:00000000-0000-4000-8000-000000000001";
const query = (searchText: string): TaskViewQuery => ({ view: "search", status: "open", searchText });

function backendFixture(overrides: Partial<TickTickBackend> = {}): TickTickBackend {
  return {
    id: "mcp",
    capabilities: () => ({
      create: true,
      update: true,
      complete: true,
      reopen: true,
      move: true,
      completedQuery: true,
      inboxQuery: true,
      exactTaskLink: true,
    }),
    accountIdentity: async () => "account-1",
    listProjects: async () => [inboxProject, workProject],
    queryTasks: async () => ({ tasks: [], failedProjectIds: [] }),
    createTask: async (input) => taskFixture({ ...input, projectId: input.projectId ?? inboxProject.id }),
    updateTask: async (_ref, patch) => taskFixture(patch),
    completeTask: async () => undefined,
    reopenTask: async () => undefined,
    moveTask: async (_ref, targetProjectId) => taskFixture({ projectId: targetProjectId }),
    ...overrides,
  };
}

function allScope(backend: TickTickBackend): TaskCacheScope {
  return { backendId: backend.id, accountKey, snapshotKey: "all" };
}

let harness = new HookHarness();
let useTaskQuery: typeof import("./useTaskQuery").useTaskQuery;

beforeAll(async () => {
  vi.doMock("react", () => ({
    useState: <T>(initial: T | (() => T)) => harness.useState(initial),
    useRef: <T>(initial: T) => harness.useRef(initial),
    useCallback: <T extends (...args: never[]) => unknown>(callback: T, dependencies: readonly unknown[]) =>
      harness.useCallback(callback, dependencies),
    useEffect: (effect: Effect, dependencies: readonly unknown[]) => harness.useEffect(effect, dependencies),
  }));
  ({ useTaskQuery } = await import("./useTaskQuery"));
});

beforeEach(() => {
  harness = new HookHarness();
});

afterAll(() => {
  vi.doUnmock("react");
});

describe("useTaskQuery", () => {
  it("keeps initial undefined data loading instead of presenting an empty result", async () => {
    const pending = deferred<TaskReadModel>();
    const service = { query: vi.fn().mockReturnValue(pending.promise) } as unknown as TickTickService;

    let result = harness.render(() => useTaskQuery(service, accountKey, query("one")));
    result = harness.render(() => useTaskQuery(service, accountKey, query("one")));

    expect(result).toMatchObject({ data: undefined, error: undefined, isLoading: true, isRefreshing: false });

    pending.resolve(model("one"));
    await settle();
    result = harness.render(() => useTaskQuery(service, accountKey, query("one")));
    expect(result).toMatchObject({ data: model("one"), error: undefined, isLoading: false, isRefreshing: false });
  });

  it("preserves data while a forced revalidation is in progress", async () => {
    const refresh = deferred<TaskReadModel>();
    const service = {
      query: vi.fn().mockResolvedValueOnce(model("cached")).mockReturnValueOnce(refresh.promise),
    } as unknown as TickTickService;

    harness.render(() => useTaskQuery(service, accountKey, query("cached")));
    await settle();
    let result = harness.render(() => useTaskQuery(service, accountKey, query("cached")));

    const revalidation = result.revalidate();
    result = harness.render(() => useTaskQuery(service, accountKey, query("cached")));
    expect(result).toMatchObject({ data: model("cached"), isLoading: false, isRefreshing: true });
    expect(service.query).toHaveBeenLastCalledWith(accountKey, query("cached"), true, expect.any(AbortSignal));

    refresh.resolve(model("fresh"));
    await revalidation;
    result = harness.render(() => useTaskQuery(service, accountKey, query("cached")));
    expect(result).toMatchObject({ data: model("fresh"), isLoading: false, isRefreshing: false });
  });

  it("shows stale cached data immediately while automatic revalidation is pending", async () => {
    const refresh = deferred<TaskReadModel>();
    const stale = { ...model("stale"), freshness: "stale" as const };
    const queryService = vi.fn().mockResolvedValueOnce(stale).mockReturnValueOnce(refresh.promise);
    const service = { query: queryService } as unknown as TickTickService;

    harness.render(() => useTaskQuery(service, accountKey, query("stale")));
    await settle();
    let result = harness.render(() => useTaskQuery(service, accountKey, query("stale")));

    expect(result).toMatchObject({ data: stale, error: undefined, isLoading: false, isRefreshing: true });
    expect(queryService.mock.calls.map((call) => call[2])).toEqual([false, true]);

    refresh.resolve(model("fresh"));
    await settle();
    result = harness.render(() => useTaskQuery(service, accountKey, query("stale")));
    expect(result).toMatchObject({ data: model("fresh"), isLoading: false, isRefreshing: false });
  });

  it("keeps shared hydration alive but ignores its late local result after search text changes", async () => {
    const oldResult = deferred<TaskReadModel>();
    const newResult = deferred<TaskReadModel>();
    const signals: AbortSignal[] = [];
    const service = {
      query: vi.fn((_accountKey, viewQuery: TaskViewQuery, _force, signal: AbortSignal) => {
        signals.push(signal);
        return viewQuery.searchText === "old" ? oldResult.promise : newResult.promise;
      }),
    } as unknown as TickTickService;

    harness.render(() => useTaskQuery(service, accountKey, query("old")));
    let result = harness.render(() => useTaskQuery(service, accountKey, query("new")));
    result = harness.render(() => useTaskQuery(service, accountKey, query("new")));

    expect(signals[0].aborted).toBe(false);
    expect(signals[1]).toBe(signals[0]);
    expect(result).toMatchObject({ data: undefined, isLoading: true, isRefreshing: false });

    newResult.resolve(model("new"));
    await settle();
    result = harness.render(() => useTaskQuery(service, accountKey, query("new")));
    expect(result.data).toEqual(model("new"));

    oldResult.resolve(model("old"));
    await settle();
    result = harness.render(() => useTaskQuery(service, accountKey, query("new")));
    expect(result.data).toEqual(model("new"));
  });

  it("coalesces rapid cold search edits into one real backend hydration", async () => {
    const projects = deferred<Awaited<ReturnType<TickTickBackend["listProjects"]>>>();
    const tasks = deferred<Awaited<ReturnType<TickTickBackend["queryTasks"]>>>();
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockReturnValue(projects.promise);
    const queryTasks = vi.fn<TickTickBackend["queryTasks"]>().mockReturnValue(tasks.promise);
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => 1_000_000);
    const service = new TickTickService({
      backend,
      repository,
      now: () => 1_000_000,
      timeZone: () => "UTC",
      sleep: async () => undefined,
    });

    harness.render(() => useTaskQuery(service, accountKey, query("needle")));
    await settle();
    harness.render(() => useTaskQuery(service, accountKey, query("hay")));
    await settle();

    expect(listProjects).toHaveBeenCalledOnce();
    projects.resolve([inboxProject]);
    await settle();
    expect(queryTasks).toHaveBeenCalledOnce();
    tasks.resolve({
      tasks: [taskFixture({ id: "needle", title: "Needle" }), taskFixture({ id: "hay", title: "Haystack" })],
      failedProjectIds: [],
    });
    await settle();

    const result = harness.render(() => useTaskQuery(service, accountKey, query("hay")));
    expect(result.data?.tasks.map((task) => task.id)).toEqual(["hay"]);
    expect(listProjects).toHaveBeenCalledOnce();
    expect(queryTasks).toHaveBeenCalledOnce();
  });

  it("coalesces rapid stale search edits while showing the locally selected stale model", async () => {
    let now = 1_000_000;
    const projects = deferred<Awaited<ReturnType<TickTickBackend["listProjects"]>>>();
    const tasks = deferred<Awaited<ReturnType<TickTickBackend["queryTasks"]>>>();
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockReturnValue(projects.promise);
    const queryTasks = vi.fn<TickTickBackend["queryTasks"]>().mockReturnValue(tasks.promise);
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => now);
    repository.refresh(allScope(backend), {
      projects: [inboxProject],
      tasks: [taskFixture({ id: "needle", title: "Needle" }), taskFixture({ id: "hay", title: "Haystack" })],
      fetchedAt: now,
      failedProjectIds: [],
    });
    now += 60_001;
    const service = new TickTickService({
      backend,
      repository,
      now: () => now,
      timeZone: () => "UTC",
      sleep: async () => undefined,
    });

    harness.render(() => useTaskQuery(service, accountKey, query("needle")));
    await settle();
    harness.render(() => useTaskQuery(service, accountKey, query("hay")));
    await settle();
    const stale = harness.render(() => useTaskQuery(service, accountKey, query("hay")));

    expect(stale).toMatchObject({ isLoading: false, isRefreshing: true });
    expect(stale.data?.tasks.map((task) => task.id)).toEqual(["hay"]);
    expect(listProjects).toHaveBeenCalledOnce();

    projects.resolve([inboxProject]);
    await settle();
    tasks.resolve({ tasks: [taskFixture({ id: "hay-fresh", title: "Hay fresh" })], failedProjectIds: [] });
    await settle();
    const fresh = harness.render(() => useTaskQuery(service, accountKey, query("hay")));
    expect(fresh.data?.tasks.map((task) => task.id)).toEqual(["hay-fresh"]);
    expect(listProjects).toHaveBeenCalledOnce();
    expect(queryTasks).toHaveBeenCalledOnce();
  });

  it.each([
    ["widens", "", ["cached", "other"], ["fresh", "other-fresh"]],
    ["changes", "other", ["other"], ["other-fresh"]],
  ] as const)(
    "%s the filter against the raw cached snapshot while a manual refresh is in flight",
    async (_case, nextSearchText, expectedCachedIds, expectedFreshIds) => {
      const projects = deferred<Awaited<ReturnType<TickTickBackend["listProjects"]>>>();
      const tasks = deferred<Awaited<ReturnType<TickTickBackend["queryTasks"]>>>();
      const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockReturnValue(projects.promise);
      const queryTasks = vi.fn<TickTickBackend["queryTasks"]>().mockReturnValue(tasks.promise);
      const backend = backendFixture({ listProjects, queryTasks });
      const repository = new TaskRepository(new InMemoryCachePort(), () => 1_000_000);
      repository.refresh(allScope(backend), {
        projects: [inboxProject],
        tasks: [
          taskFixture({ id: "cached", title: "Cached result" }),
          taskFixture({ id: "other", title: "Other result" }),
        ],
        fetchedAt: 1_000_000,
        failedProjectIds: [],
      });
      const service = new TickTickService({
        backend,
        repository,
        now: () => 1_000_000,
        timeZone: () => "UTC",
        sleep: async () => undefined,
      });

      harness.render(() => useTaskQuery(service, accountKey, query("cached")));
      await settle();
      let result = harness.render(() => useTaskQuery(service, accountKey, query("cached")));
      expect(result.data?.tasks.map((task) => task.id)).toEqual(["cached"]);

      const manualRefresh = result.revalidate();
      await settle();
      result = harness.render(() => useTaskQuery(service, accountKey, query(nextSearchText)));
      expect(result.data?.tasks.map((task) => task.id)).toEqual(expectedCachedIds);
      expect(result).toMatchObject({ isLoading: false, isRefreshing: true });

      await settle();
      result = harness.render(() => useTaskQuery(service, accountKey, query(nextSearchText)));
      expect(result.data?.tasks.map((task) => task.id)).toEqual(expectedCachedIds);
      expect(result).toMatchObject({ isLoading: false, isRefreshing: true });
      expect(listProjects).toHaveBeenCalledOnce();

      projects.resolve([inboxProject]);
      await settle();
      tasks.resolve({
        tasks: [
          taskFixture({ id: "fresh", title: "Fresh result" }),
          taskFixture({ id: "other-fresh", title: "Other fresh result" }),
        ],
        failedProjectIds: [],
      });
      await manualRefresh;
      await settle();
      result = harness.render(() => useTaskQuery(service, accountKey, query(nextSearchText)));

      expect(result.data?.tasks.map((task) => task.id)).toEqual(expectedFreshIds);
      expect(result).toMatchObject({ isLoading: false, isRefreshing: false });
      expect(listProjects).toHaveBeenCalledOnce();
      expect(queryTasks).toHaveBeenCalledOnce();
    }
  );

  it("does not launch a second refresh when a joined manual refresh fails after a filter edit", async () => {
    const projects = deferred<Awaited<ReturnType<TickTickBackend["listProjects"]>>>();
    const tasks = deferred<Awaited<ReturnType<TickTickBackend["queryTasks"]>>>();
    const listProjects = vi.fn<TickTickBackend["listProjects"]>().mockReturnValue(projects.promise);
    const queryTasks = vi.fn<TickTickBackend["queryTasks"]>().mockReturnValue(tasks.promise);
    const backend = backendFixture({ listProjects, queryTasks });
    const repository = new TaskRepository(new InMemoryCachePort(), () => 1_000_000);
    repository.refresh(allScope(backend), {
      projects: [inboxProject],
      tasks: [
        taskFixture({ id: "cached", title: "Cached result" }),
        taskFixture({ id: "other", title: "Other result" }),
      ],
      fetchedAt: 1_000_000,
      failedProjectIds: [],
    });
    const service = new TickTickService({
      backend,
      repository,
      now: () => 1_000_000,
      timeZone: () => "UTC",
      sleep: async () => undefined,
    });

    harness.render(() => useTaskQuery(service, accountKey, query("cached")));
    await settle();
    let result = harness.render(() => useTaskQuery(service, accountKey, query("cached")));
    const manualRefresh = result.revalidate();
    await settle();

    result = harness.render(() => useTaskQuery(service, accountKey, query("other")));
    expect(result.data?.tasks.map((task) => task.id)).toEqual(["other"]);
    expect(result).toMatchObject({ isLoading: false, isRefreshing: true });

    projects.resolve([inboxProject]);
    await settle();
    tasks.reject(new ProtocolError("synthetic refresh failure"));
    await manualRefresh;
    await settle();
    result = harness.render(() => useTaskQuery(service, accountKey, query("other")));

    expect(result.data?.tasks.map((task) => task.id)).toEqual(["other"]);
    expect(result.data).toMatchObject({ freshness: "stale" });
    expect(result.data?.warning).toMatch(/couldn.t refresh TickTick/i);
    expect(result).toMatchObject({ isLoading: false, isRefreshing: false });
    expect(listProjects).toHaveBeenCalledOnce();
    expect(queryTasks).toHaveBeenCalledOnce();
  });

  it("aborts on unmount and never writes a late result", async () => {
    const pending = deferred<TaskReadModel>();
    let signal: AbortSignal | undefined;
    const service = {
      query: vi.fn((_accountKey, _viewQuery, _force, requestSignal: AbortSignal) => {
        signal = requestSignal;
        return pending.promise;
      }),
    } as unknown as TickTickService;

    harness.render(() => useTaskQuery(service, accountKey, query("pending")));
    harness.unmount();
    pending.resolve(model("late"));
    await settle();

    expect(signal?.aborted).toBe(true);
    expect(harness.updatesAfterUnmount).toBe(0);
  });

  it("exposes an initial failure without retrying it", async () => {
    const failure = new Error("synthetic failure");
    const service = { query: vi.fn().mockRejectedValue(failure) } as unknown as TickTickService;

    harness.render(() => useTaskQuery(service, accountKey, query("failure")));
    await settle();
    const result = harness.render(() => useTaskQuery(service, accountKey, query("failure")));

    expect(result).toMatchObject({ data: undefined, error: failure, isLoading: false, isRefreshing: false });
    expect(service.query).toHaveBeenCalledOnce();
  });
});
