import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  createReadyCommandRuntime,
  type CommandRuntimeState,
  type ReadyCommandRuntime,
} from "../application/commandRuntime";
import type { TaskDestinationPreferencePort } from "../application/taskDestination";
import type { CreateTaskCommandRuntimeDependencies } from "../commands/createTaskCommandRuntime";
import type { CreateTaskRuntime } from "../components/CreateTaskCommand";
import { ProtocolError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { Task } from "../domain/task";
import type { TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { TaskRepository } from "../infrastructure/cache/TaskRepository";
import { InMemoryCachePort } from "../test/fakes/InMemoryCachePort";

type Cleanup = () => void;
type Effect = () => void | Cleanup;
type Slot =
  | { kind: "state"; value: unknown }
  | { kind: "ref"; current: unknown }
  | { kind: "layoutEffect"; dependencies: readonly unknown[]; setup: Effect; cleanup?: Cleanup }
  | { kind: "effect"; dependencies: readonly unknown[]; setup: Effect; cleanup?: Cleanup };

class HookHarness {
  private slots: Slot[] = [];
  private cursor = 0;
  private pendingLayoutEffects: Array<{ index: number; effect: Effect; dependencies: readonly unknown[] }> = [];
  private pendingEffects: Array<{ index: number; effect: Effect; dependencies: readonly unknown[] }> = [];
  private unmounted = false;
  updatesAfterUnmount = 0;
  stateWrites = 0;

  render<T>(hook: () => T): T {
    const result = this.renderWithoutEffects(hook);
    this.flushEffects();
    return result;
  }

  renderWithoutEffects<T>(hook: () => T): T {
    this.cursor = 0;
    return hook();
  }

  flushEffects(): void {
    this.flushLayoutEffects();
    const pending = this.pendingEffects;
    this.pendingEffects = [];
    for (const { index, effect, dependencies } of pending) {
      const previous = this.slots[index];
      if (previous.kind === "effect") previous.cleanup?.();
      const cleanup = effect();
      this.slots[index] = { kind: "effect", dependencies, setup: effect, ...(cleanup ? { cleanup } : {}) };
    }
  }

  private flushLayoutEffects(): void {
    const pending = this.pendingLayoutEffects;
    this.pendingLayoutEffects = [];
    for (const { index, effect, dependencies } of pending) {
      const previous = this.slots[index];
      if (previous.kind === "layoutEffect") previous.cleanup?.();
      const cleanup = effect();
      this.slots[index] = { kind: "layoutEffect", dependencies, setup: effect, ...(cleanup ? { cleanup } : {}) };
    }
  }

  strictEffectsCycle(): void {
    const layouts = this.slots.filter(
      (slot): slot is Extract<Slot, { kind: "layoutEffect" }> => slot.kind === "layoutEffect"
    );
    const effects = this.slots.filter((slot): slot is Extract<Slot, { kind: "effect" }> => slot.kind === "effect");
    for (const effect of layouts) effect.cleanup?.();
    for (const effect of effects) effect.cleanup?.();
    for (const effect of layouts) effect.cleanup = effect.setup() || undefined;
    for (const effect of effects) effect.cleanup = effect.setup() || undefined;
  }

  unmount(): void {
    this.unmounted = true;
    for (const slot of this.slots) if (slot.kind === "layoutEffect") slot.cleanup?.();
    for (const slot of this.slots) if (slot.kind === "effect") slot.cleanup?.();
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
      this.stateWrites += 1;
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

  useLayoutEffect(effect: Effect, dependencies: readonly unknown[]): void {
    const index = this.cursor++;
    const existing = this.slots[index];
    if (!existing || existing.kind !== "layoutEffect" || !sameDependencies(existing.dependencies, dependencies)) {
      this.pendingLayoutEffects.push({ index, effect, dependencies });
      if (!existing) this.slots[index] = { kind: "layoutEffect", dependencies, setup: effect };
    }
  }

  useEffect(effect: Effect, dependencies: readonly unknown[]): void {
    const index = this.cursor++;
    const existing = this.slots[index];
    if (!existing || existing.kind !== "effect" || !sameDependencies(existing.dependencies, dependencies)) {
      this.pendingEffects.push({ index, effect, dependencies });
      if (!existing) this.slots[index] = { kind: "effect", dependencies, setup: effect };
    }
  }
}

function sameDependencies(left: readonly unknown[], right: readonly unknown[]): boolean {
  return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
}

interface Deferred<T> {
  readonly promise: Promise<T>;
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
  for (let index = 0; index < 20; index += 1) await Promise.resolve();
}

const inboxProject: Project = Object.freeze({
  id: "project-inbox",
  name: "Inbox",
  kind: "inbox",
  closed: false,
});

const confirmedTask: Task = Object.freeze({
  id: "task-confirmed",
  projectId: inboxProject.id,
  title: "Synthetic task",
  projectName: inboxProject.name,
  status: "open",
  priority: 0,
  tags: Object.freeze([]) as unknown as string[],
  kind: "TEXT",
  isAllDay: false,
  isFloating: true,
  timeZone: "UTC",
});

function backend(id: TickTickBackend["id"] = "mcp", createTask = vi.fn(async () => confirmedTask)): TickTickBackend {
  return {
    id,
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
    accountIdentity: async () => undefined,
    listProjects: async () => [inboxProject],
    queryTasks: async () => ({ tasks: [], failedProjectIds: [] }),
    createTask,
    updateTask: async () => {
      throw new Error("unused");
    },
    completeTask: async () => undefined,
    reopenTask: async () => undefined,
    moveTask: async () => {
      throw new Error("unused");
    },
  };
}

function runtime(
  backendId: TickTickBackend["id"],
  accountKey: string,
  recovery: Readonly<{ onReconnect?: () => void; onOpenPreferences?: () => void }> = {},
  createTask = vi.fn(async () => confirmedTask)
): ReadyCommandRuntime {
  return createReadyCommandRuntime({
    backend: backend(backendId, createTask),
    accountKey,
    repository: new TaskRepository(new InMemoryCachePort()),
    ...recovery,
  });
}

function preferencePort(remembered = inboxProject.id): TaskDestinationPreferencePort {
  return {
    load: vi.fn(async () => remembered),
    remember: vi.fn(async () => undefined),
  };
}

function dependencies(
  overrides: Partial<CreateTaskCommandRuntimeDependencies> = {}
): CreateTaskCommandRuntimeDependencies {
  return {
    preferences: preferencePort(),
    loadDefaults: vi.fn(async () => ({ uiTimeZone: "UTC" })),
    fieldAvailability: { project: true, description: false, dueDate: true },
    ...overrides,
  };
}

let harness = new HookHarness();
let useCreateTaskCommandRuntime: typeof import("./useCreateTaskCommandRuntime").useCreateTaskCommandRuntime;

beforeAll(async () => {
  vi.doMock("react", () => ({
    useState: <T>(initial: T | (() => T)) => harness.useState(initial),
    useRef: <T>(initial: T) => harness.useRef(initial),
    useLayoutEffect: (effect: Effect, dependencies: readonly unknown[]) =>
      harness.useLayoutEffect(effect, dependencies),
    useEffect: (effect: Effect, dependencies: readonly unknown[]) => harness.useEffect(effect, dependencies),
  }));
  ({ useCreateTaskCommandRuntime } = await import("./useCreateTaskCommandRuntime"));
});

beforeEach(() => {
  harness = new HookHarness();
});

afterAll(() => {
  vi.doUnmock("react");
  vi.resetModules();
});

describe("useCreateTaskCommandRuntime", () => {
  it("exposes the command-specific hook contract", () => {
    expectTypeOf(useCreateTaskCommandRuntime).toBeFunction();
    expectTypeOf(useCreateTaskCommandRuntime).parameter(0).toEqualTypeOf<CommandRuntimeState>();
    expectTypeOf(useCreateTaskCommandRuntime).parameter(1).toEqualTypeOf<CreateTaskCommandRuntimeDependencies>();
    expectTypeOf(useCreateTaskCommandRuntime).returns.toEqualTypeOf<CreateTaskRuntime>();
  });

  it("passes loading and raw bootstrap errors through without reading preparation ports", () => {
    const loading = Object.freeze({ kind: "loading" } as const);
    const marker = Object.freeze({ private: "bootstrap failure" });
    const error = Object.freeze({ kind: "error", error: marker } as const);
    const deps = dependencies();

    expect(harness.render(() => useCreateTaskCommandRuntime(loading, deps))).toBe(loading);
    expect(harness.render(() => useCreateTaskCommandRuntime(error, deps))).toBe(error);
    expect(deps.preferences.load).not.toHaveBeenCalled();
    expect(deps.loadDefaults).not.toHaveBeenCalled();
  });

  it("returns loading immediately and publishes one prepared ready runtime", async () => {
    const source = runtime("mcp", "oauth:account-a");
    const listProjects = vi.spyOn(source.taskService, "listProjects").mockResolvedValue([inboxProject]);
    const deps = dependencies();

    let result = harness.render(() => useCreateTaskCommandRuntime(source, deps));
    expect(result).toEqual({ kind: "loading" });

    await settle();
    result = harness.render(() => useCreateTaskCommandRuntime(source, deps));

    expect(result).toMatchObject({
      kind: "ready",
      contextKey: source.contextKey,
      projects: [inboxProject],
      rememberedProjectId: inboxProject.id,
      uiTimeZone: "UTC",
    });
    expect(listProjects).toHaveBeenCalledOnce();
    expect(deps.preferences.load).toHaveBeenCalledOnce();
    expect(deps.loadDefaults).toHaveBeenCalledOnce();
  });

  it("switches to loading synchronously, aborts A, and never publishes A after B commits", async () => {
    const pendingA = deferred<Project[]>();
    const pendingB = deferred<Project[]>();
    const sourceA = runtime("mcp", "oauth:account-a");
    const sourceB = runtime("openapi", "oauth:account-b");
    let signalA: AbortSignal | undefined;
    vi.spyOn(sourceA.taskService, "listProjects").mockImplementation((_accountKey, _force, signal) => {
      signalA = signal;
      return pendingA.promise;
    });
    vi.spyOn(sourceB.taskService, "listProjects").mockImplementation(() => pendingB.promise);
    const depsA = dependencies();
    const depsB = dependencies();

    harness.render(() => useCreateTaskCommandRuntime(sourceA, depsA));
    let result = harness.renderWithoutEffects(() => useCreateTaskCommandRuntime(sourceB, depsB));
    expect(result).toEqual({ kind: "loading" });
    harness.flushEffects();
    await settle();
    expect(signalA?.aborted).toBe(true);

    const writesBeforeA = harness.stateWrites;
    pendingA.resolve([inboxProject]);
    await settle();
    expect(harness.stateWrites).toBe(writesBeforeA);

    pendingB.resolve([inboxProject]);
    await settle();
    result = harness.render(() => useCreateTaskCommandRuntime(sourceB, depsB));
    expect(result).toMatchObject({ kind: "ready", contextKey: sourceB.contextKey });
    expect(result).not.toMatchObject({ contextKey: sourceA.contextKey });
  });

  it("uses the latest callbacks before setup and ignores same-context port identity churn after one load", async () => {
    const source = runtime("mcp", "oauth:stable");
    const listProjects = vi.spyOn(source.taskService, "listProjects").mockResolvedValue([inboxProject]);
    const stale = dependencies({ loadDefaults: vi.fn(async () => ({ uiTimeZone: "America/Chicago" })) });
    const latest = dependencies({ loadDefaults: vi.fn(async () => ({ uiTimeZone: "America/Denver" })) });

    harness.renderWithoutEffects(() => useCreateTaskCommandRuntime(source, stale));
    harness.renderWithoutEffects(() => useCreateTaskCommandRuntime(source, latest));
    harness.flushEffects();
    await settle();
    let result = harness.render(() => useCreateTaskCommandRuntime(source, dependencies()));

    expect(result).toMatchObject({ kind: "ready", uiTimeZone: "America/Denver" });
    expect(stale.loadDefaults).not.toHaveBeenCalled();
    expect(latest.loadDefaults).toHaveBeenCalledOnce();
    expect(listProjects).toHaveBeenCalledOnce();

    result = harness.render(() => useCreateTaskCommandRuntime(source, dependencies()));
    expect(result).toMatchObject({ kind: "ready", uiTimeZone: "America/Denver" });
    expect(listProjects).toHaveBeenCalledOnce();
  });

  it("publishes the latest committed recovery callbacks when same-context runtime identity changes in flight", async () => {
    const pending = deferred<Project[]>();
    const oldReconnect = vi.fn();
    const oldPreferences = vi.fn();
    const latestReconnect = vi.fn();
    const latestPreferences = vi.fn();
    const sourceOld = runtime("mcp", "oauth:same-context", {
      onReconnect: oldReconnect,
      onOpenPreferences: oldPreferences,
    });
    const sourceLatest = runtime("mcp", "oauth:same-context", {
      onReconnect: latestReconnect,
      onOpenPreferences: latestPreferences,
    });
    expect(sourceLatest.contextKey).toBe(sourceOld.contextKey);
    const oldCatalog = vi.spyOn(sourceOld.taskService, "listProjects").mockReturnValue(pending.promise);
    const latestCatalog = vi.spyOn(sourceLatest.taskService, "listProjects");
    const deps = dependencies();

    harness.render(() => useCreateTaskCommandRuntime(sourceOld, deps));
    harness.render(() => useCreateTaskCommandRuntime(sourceLatest, dependencies()));
    pending.reject(new Error("synthetic preparation failure"));
    await settle();
    const result = harness.render(() => useCreateTaskCommandRuntime(sourceLatest, dependencies()));

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error state");
    expect(result.recovery?.onReconnect).toBe(latestReconnect);
    expect(result.recovery?.onOpenPreferences).toBe(latestPreferences);
    expect(result.recovery?.onReconnect).not.toBe(oldReconnect);
    expect(result.recovery?.onOpenPreferences).not.toBe(oldPreferences);
    expect(oldCatalog).toHaveBeenCalledOnce();
    expect(latestCatalog).not.toHaveBeenCalled();
  });

  it("projects latest same-context recovery callbacks after an error is visible without reloading private sources", async () => {
    const marker = Object.freeze({ private: "catalog failure" });
    const oldReconnect = vi.fn();
    const oldPreferences = vi.fn();
    const latestReconnect = vi.fn();
    const latestPreferences = vi.fn();
    const sourceOld = runtime("mcp", "oauth:visible-error", {
      onReconnect: oldReconnect,
      onOpenPreferences: oldPreferences,
    });
    const sourceLatest = runtime("mcp", "oauth:visible-error", {
      onReconnect: latestReconnect,
      onOpenPreferences: latestPreferences,
    });
    expect(sourceLatest.contextKey).toBe(sourceOld.contextKey);
    const oldCatalog = vi.spyOn(sourceOld.taskService, "listProjects").mockRejectedValue(marker);
    const latestCatalog = vi.spyOn(sourceLatest.taskService, "listProjects");
    const reads = { preferences: 0, defaults: 0, fields: 0 };
    const hostile = Object.defineProperties(
      {},
      {
        preferences: {
          get() {
            reads.preferences += 1;
            throw new Error("PRIVATE preferences");
          },
        },
        loadDefaults: {
          get() {
            reads.defaults += 1;
            throw new Error("PRIVATE defaults");
          },
        },
        fieldAvailability: {
          get() {
            reads.fields += 1;
            throw new Error("PRIVATE fields");
          },
        },
      }
    ) as CreateTaskCommandRuntimeDependencies;

    harness.render(() => useCreateTaskCommandRuntime(sourceOld, hostile));
    await settle();
    let result = harness.render(() => useCreateTaskCommandRuntime(sourceOld, hostile));
    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error state");
    expect(result.recovery?.onReconnect).toBe(oldReconnect);
    expect(result.recovery?.onOpenPreferences).toBe(oldPreferences);

    result = harness.render(() => useCreateTaskCommandRuntime(sourceLatest, hostile));

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error state");
    expect(result.error).toBe(marker);
    expect(result.recovery?.onReconnect).toBe(latestReconnect);
    expect(result.recovery?.onOpenPreferences).toBe(latestPreferences);
    expect(result.recovery?.onReconnect).not.toBe(oldReconnect);
    expect(result.recovery?.onOpenPreferences).not.toBe(oldPreferences);
    expect(oldCatalog).toHaveBeenCalledOnce();
    expect(latestCatalog).not.toHaveBeenCalled();
    expect(reads).toEqual({ preferences: 0, defaults: 0, fields: 0 });
  });

  it("survives Strict Effects without duplicating catalog, preference, or defaults reads", async () => {
    const source = runtime("mcp", "oauth:strict");
    const pending = deferred<Project[]>();
    const listProjects = vi.spyOn(source.taskService, "listProjects").mockReturnValue(pending.promise);
    const deps = dependencies();

    harness.render(() => useCreateTaskCommandRuntime(source, deps));
    harness.strictEffectsCycle();
    expect(listProjects).toHaveBeenCalledOnce();

    pending.resolve([inboxProject]);
    await settle();
    const result = harness.render(() => useCreateTaskCommandRuntime(source, deps));

    expect(result.kind).toBe("ready");
    expect(listProjects).toHaveBeenCalledOnce();
    expect(deps.preferences.load).toHaveBeenCalledOnce();
    expect(deps.loadDefaults).toHaveBeenCalledOnce();
  });

  it("aborts on unmount and suppresses every late publication", async () => {
    const source = runtime("mcp", "oauth:unmount");
    const pending = deferred<Project[]>();
    let signal: AbortSignal | undefined;
    vi.spyOn(source.taskService, "listProjects").mockImplementation((_accountKey, _force, receivedSignal) => {
      signal = receivedSignal;
      return pending.promise;
    });

    harness.render(() => useCreateTaskCommandRuntime(source, dependencies()));
    harness.unmount();
    await settle();
    expect(signal?.aborted).toBe(true);

    pending.resolve([inboxProject]);
    await settle();
    expect(harness.updatesAfterUnmount).toBe(0);
  });

  it("preserves raw preparation errors with recovery and retries only preparation on an explicit generation", async () => {
    const marker = Object.freeze({ private: "catalog failure" });
    const onReconnect = vi.fn();
    const onOpenPreferences = vi.fn();
    const createTask = vi.fn(async () => confirmedTask);
    const source = runtime("mcp", "oauth:retry", { onReconnect, onOpenPreferences }, createTask);
    const listProjects = vi
      .spyOn(source.taskService, "listProjects")
      .mockRejectedValueOnce(marker)
      .mockResolvedValueOnce([inboxProject]);
    const deps = dependencies();

    harness.render(() => useCreateTaskCommandRuntime(source, deps));
    await settle();
    let result = harness.render(() => useCreateTaskCommandRuntime(source, deps));
    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error state");
    expect(result.error).toBe(marker);
    expect(result.recovery?.onReconnect).toBe(onReconnect);
    expect(result.recovery?.onOpenPreferences).toBe(onOpenPreferences);
    expect(result.recovery?.onRetry).toBeTypeOf("function");
    expect(listProjects).toHaveBeenCalledOnce();
    expect(createTask).not.toHaveBeenCalled();

    await result.recovery?.onRetry?.();
    result = harness.render(() => useCreateTaskCommandRuntime(source, deps));
    expect(result).toEqual({ kind: "loading" });
    await settle();
    result = harness.render(() => useCreateTaskCommandRuntime(source, deps));

    expect(result.kind).toBe("ready");
    expect(listProjects).toHaveBeenCalledTimes(2);
    expect(createTask).not.toHaveBeenCalled();
  });

  it("fails closed for an untrusted ready-shaped runtime without reading preparation ports", () => {
    const accepted = runtime("mcp", "oauth:accepted");
    const forged = { ...accepted } as ReadyCommandRuntime;
    const deps = dependencies();

    const result = harness.render(() => useCreateTaskCommandRuntime(forged, deps));

    expect(result).toEqual({
      kind: "error",
      error: new ProtocolError("TickTick create command runtime is invalid."),
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(deps.preferences.load).not.toHaveBeenCalled();
    expect(deps.loadDefaults).not.toHaveBeenCalled();
  });

  it("has no concrete backend, factory, Raycast, legacy, network, logging, or timer dependency", () => {
    const source = readFileSync(resolve(__dirname, "useCreateTaskCommandRuntime.ts"), "utf8");

    expect(source).not.toMatch(
      /McpTickTickBackend|OpenApiTickTickBackend|MacOsAppleScriptBackend|BackendFactory|@raycast\/api|LocalStorage|run-applescript|\bfetch\b|XMLHttpRequest|WebSocket|console\.|setTimeout|setInterval|Task8/i
    );
    expect(source).not.toMatch(/infrastructure\/(?:mcp|openapi|macos)|\.\.\/service|\.\.\/platform/);
  });
});
