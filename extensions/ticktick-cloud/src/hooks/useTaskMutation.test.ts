import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { TaskMutationService } from "../application/TaskMutationService";
import { AmbiguousMutationError, NetworkError, NotFoundError, ValidationError } from "../domain/errors";
import { taskFixture, workProject } from "../test/fixtures/tasks";

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
  stateWrites = 0;

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
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}

function serviceFixture(overrides: Partial<TaskMutationService> = {}): TaskMutationService {
  return {
    backendId: "mcp",
    complete: vi.fn(async () => undefined),
    reopen: vi.fn(async () => undefined),
    update: vi.fn(async (_accountKey, task, patch) => ({ ...task, ...patch })),
    move: vi.fn(async (_accountKey, task, targetProjectId) => ({ ...task, projectId: targetProjectId })),
    ...overrides,
  } as unknown as TaskMutationService;
}

const accountKey = "oauth:00000000-0000-4000-8000-000000000001";
let harness = new HookHarness();
let useTaskMutation: typeof import("./useTaskMutation").useTaskMutation;

beforeAll(async () => {
  vi.doMock("react", () => ({
    useState: <T>(initial: T | (() => T)) => harness.useState(initial),
    useRef: <T>(initial: T) => harness.useRef(initial),
    useCallback: <T extends (...args: never[]) => unknown>(callback: T, dependencies: readonly unknown[]) =>
      harness.useCallback(callback, dependencies),
    useEffect: (effect: Effect, dependencies: readonly unknown[]) => harness.useEffect(effect, dependencies),
  }));
  ({ useTaskMutation } = await import("./useTaskMutation"));
});

beforeEach(() => {
  harness = new HookHarness();
});

afterAll(() => {
  vi.doUnmock("react");
});

describe("useTaskMutation", () => {
  it("coalesces duplicate concurrent clicks per exact composite task and action while exposing pending", async () => {
    const gate = deferred<void>();
    const complete = vi.fn<TaskMutationService["complete"]>().mockReturnValue(gate.promise);
    const service = serviceFixture({ complete });
    const task = taskFixture({ id: "duplicate", projectId: "project-a" });

    let result = harness.render(() => useTaskMutation(service, accountKey));
    const first = result.complete(task);
    const second = result.complete(task);
    result = harness.render(() => useTaskMutation(service, accountKey));

    expect(complete).toHaveBeenCalledOnce();
    expect(second).toBe(first);
    expect(result.isPending(task, "complete")).toBe(true);
    expect(result.hasPending).toBe(true);

    gate.resolve();
    await Promise.all([first, second]);
    await settle();
    result = harness.render(() => useTaskMutation(service, accountKey));
    expect(result.isPending(task, "complete")).toBe(false);
    expect(result.hasPending).toBe(false);
  });

  it("runs the same ID in different projects concurrently because their composite refs differ", async () => {
    const gates = [deferred<void>(), deferred<void>()];
    const complete = vi
      .fn<TaskMutationService["complete"]>()
      .mockReturnValueOnce(gates[0].promise)
      .mockReturnValueOnce(gates[1].promise);
    const service = serviceFixture({ complete });
    const projectA = taskFixture({ id: "shared", projectId: "project-a" });
    const projectB = taskFixture({ id: "shared", projectId: "project-b" });

    const result = harness.render(() => useTaskMutation(service, accountKey));
    const mutations = [result.complete(projectA), result.complete(projectB)];

    expect(complete).toHaveBeenCalledTimes(2);
    gates.forEach((gate) => gate.resolve());
    await Promise.all(mutations);
  });

  it("rejects complete-to-reopen conflicts locally without altering the active mutation state", async () => {
    const completeGate = deferred<void>();
    const complete = vi.fn<TaskMutationService["complete"]>().mockReturnValue(completeGate.promise);
    const reopen = vi.fn<TaskMutationService["reopen"]>().mockResolvedValue(undefined);
    const service = serviceFixture({ complete, reopen });
    const openTask = taskFixture({ id: "status-order", projectId: "project-a" });

    const result = harness.render(() => useTaskMutation(service, accountKey));
    const completing = result.complete(openTask);
    const writesWithCompletePending = harness.stateWrites;
    const reopening = result.reopen({ ...openTask, status: "completed" });

    expect(complete).toHaveBeenCalledOnce();
    expect(reopen).not.toHaveBeenCalled();
    expect(harness.stateWrites).toBe(writesWithCompletePending);
    completeGate.resolve();
    await expect(reopening).rejects.toEqual(
      expect.objectContaining({
        name: "ValidationError",
        message: "Another change to this task is already in progress.",
        retryable: false,
      })
    );
    await completing;
    await settle();
    const settled = harness.render(() => useTaskMutation(service, accountKey));
    await expect(settled.retry()).resolves.toBeUndefined();
    expect(complete).toHaveBeenCalledOnce();
    expect(reopen).not.toHaveBeenCalled();
  });

  it("rejects move A-to-B then C without invoking or queueing the stale second target", async () => {
    const firstGate = deferred<Awaited<ReturnType<TaskMutationService["move"]>>>();
    const move = vi.fn<TaskMutationService["move"]>().mockReturnValue(firstGate.promise);
    const service = serviceFixture({ move });
    const task = taskFixture({ id: "move-order", projectId: "project-a" });
    const firstConfirmed = { ...task, projectId: "project-b" };
    let result = harness.render(() => useTaskMutation(service, accountKey));

    const first = result.move(task, "project-b");
    const second = result.move(task, "project-c");

    expect(move).toHaveBeenCalledTimes(1);
    expect(move).toHaveBeenNthCalledWith(1, accountKey, task, "project-b");
    firstGate.resolve(firstConfirmed);
    await expect(second).rejects.toBeInstanceOf(ValidationError);
    result = harness.render(() => useTaskMutation(service, accountKey));
    expect(result.error).toBeUndefined();
    await expect(first).resolves.toEqual(firstConfirmed);
    expect(move).toHaveBeenCalledOnce();
  });

  it("rejects distinct update patches while coalescing a stable exact active patch fingerprint", async () => {
    const firstGate = deferred<Awaited<ReturnType<TaskMutationService["update"]>>>();
    const update = vi.fn<TaskMutationService["update"]>().mockReturnValue(firstGate.promise);
    const service = serviceFixture({ update });
    const task = taskFixture({ id: "patch-order", projectId: "project-a" });
    const result = harness.render(() => useTaskMutation(service, accountKey));

    const firstPatch = { title: "First", tags: ["stable"] };
    const sameFirstPatchDifferentKeyOrder = { tags: ["stable"], title: "First" };
    const secondPatch = { title: "Second" };
    const first = result.update(task, firstPatch);
    const duplicate = result.update(task, sameFirstPatchDifferentKeyOrder);
    const second = result.update(task, secondPatch);

    expect(update).toHaveBeenCalledTimes(1);
    expect(duplicate).toBe(first);
    firstGate.resolve({ ...task, ...firstPatch });
    await expect(second).rejects.toMatchObject({
      name: "ValidationError",
      message: "Another change to this task is already in progress.",
      retryable: false,
    });
    await expect(Promise.all([first, duplicate])).resolves.toEqual([
      { ...task, ...firstPatch },
      { ...task, ...firstPatch },
    ]);
    expect(update).toHaveBeenCalledOnce();
  });

  it("rejects update-to-complete conflicts without invoking complete", async () => {
    const updateGate = deferred<Awaited<ReturnType<TaskMutationService["update"]>>>();
    const update = vi.fn<TaskMutationService["update"]>().mockReturnValue(updateGate.promise);
    const complete = vi.fn<TaskMutationService["complete"]>().mockResolvedValue(undefined);
    const service = serviceFixture({ update, complete });
    const task = taskFixture({ id: "update-complete-conflict", projectId: "project-a" });
    const result = harness.render(() => useTaskMutation(service, accountKey));

    const updating = result.update(task, { title: "In flight" });
    const completing = result.complete(task);

    updateGate.resolve({ ...task, title: "In flight" });
    await expect(completing).rejects.toMatchObject({
      name: "ValidationError",
      message: "Another change to this task is already in progress.",
      retryable: false,
    });
    expect(complete).not.toHaveBeenCalled();
    await updating;
  });

  it.each([
    ["failed", new NetworkError("Unable to reach TickTick.")],
    ["ambiguous", new AmbiguousMutationError("private upstream detail")],
  ] as const)("never invokes a downstream conflict after a %s predecessor", async (_case, predecessorFailure) => {
    const updateGate = deferred<Awaited<ReturnType<TaskMutationService["update"]>>>();
    const update = vi.fn<TaskMutationService["update"]>().mockReturnValue(updateGate.promise);
    const complete = vi.fn<TaskMutationService["complete"]>().mockResolvedValue(undefined);
    const service = serviceFixture({ update, complete });
    const task = taskFixture({ id: `no-downstream-${_case}`, projectId: "project-a" });
    const revalidate = vi.fn(async () => undefined);
    let result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));

    const predecessor = result.update(task, { title: "Predecessor" });
    const downstream = result.complete(task);
    const predecessorOutcome = expect(predecessor).rejects.toBe(predecessorFailure);
    const downstreamOutcome = expect(downstream).rejects.toBeInstanceOf(ValidationError);
    updateGate.reject(predecessorFailure);
    await downstreamOutcome;
    await predecessorOutcome;
    await settle();
    result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));

    expect(complete).not.toHaveBeenCalled();
    expect(result.error?.title).toBe(
      predecessorFailure instanceof AmbiguousMutationError ? "Task Update Status Unknown" : "Couldn't Update Task"
    );
    expect(revalidate).toHaveBeenCalledTimes(predecessorFailure instanceof AmbiguousMutationError ? 1 : 0);
  });

  it("preserves the predecessor's unknown-status presentation when a conflict arrives during revalidation", async () => {
    const updateGate = deferred<Awaited<ReturnType<TaskMutationService["update"]>>>();
    const refreshGate = deferred<void>();
    const update = vi.fn<TaskMutationService["update"]>().mockReturnValue(updateGate.promise);
    const complete = vi.fn<TaskMutationService["complete"]>().mockResolvedValue(undefined);
    const service = serviceFixture({ update, complete });
    const task = taskFixture({ id: "conflict-during-refresh", projectId: "project-a" });
    const revalidate = vi.fn(() => refreshGate.promise);
    let result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));

    const predecessor = result.update(task, { title: "Unknown" });
    const predecessorOutcome = expect(predecessor).rejects.toBeInstanceOf(AmbiguousMutationError);
    updateGate.reject(new AmbiguousMutationError("private upstream detail"));
    await settle();
    result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));
    const writesBeforeConflict = harness.stateWrites;

    await expect(result.complete(task)).rejects.toBeInstanceOf(ValidationError);
    result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));
    expect(harness.stateWrites).toBe(writesBeforeConflict);
    expect(result.error).toEqual({
      title: "Task Update Status Unknown",
      message: "TickTick may have applied this change. Refresh before trying again.",
      canRetry: false,
      refreshRequired: true,
    });
    await expect(result.retry()).resolves.toBeUndefined();
    expect(complete).not.toHaveBeenCalled();
    expect(revalidate).toHaveBeenCalledOnce();

    refreshGate.resolve();
    await predecessorOutcome;
  });

  it("keeps A active across an A-to-B-to-A request sequence and starts a new A only after settlement", async () => {
    const firstGate = deferred<Awaited<ReturnType<TaskMutationService["move"]>>>();
    const move = vi
      .fn<TaskMutationService["move"]>()
      .mockReturnValueOnce(firstGate.promise)
      .mockResolvedValue({ ...taskFixture({ id: "a-b-a", projectId: "project-a" }), projectId: "project-b" });
    const service = serviceFixture({ move });
    const task = taskFixture({ id: "a-b-a", projectId: "project-a" });
    const result = harness.render(() => useTaskMutation(service, accountKey));

    const firstA = result.move(task, "project-b");
    const rejectedB = result.move(task, "project-c");
    const nonAdjacentA = result.move(task, "project-b");

    expect(nonAdjacentA).toBe(firstA);
    expect(move).toHaveBeenCalledOnce();
    firstGate.resolve({ ...task, projectId: "project-b" });
    await expect(rejectedB).rejects.toBeInstanceOf(ValidationError);
    await Promise.all([firstA, nonAdjacentA]);
    await settle();

    const laterA = result.move(task, "project-b");
    expect(laterA).not.toBe(firstA);
    expect(move).toHaveBeenCalledTimes(2);
    await laterA;
  });

  it("never retries automatically and retries a retryable failure only after the user invokes retry", async () => {
    const failure = new NetworkError("Unable to reach TickTick.");
    const complete = vi
      .fn<TaskMutationService["complete"]>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined);
    const service = serviceFixture({ complete });
    const task = taskFixture({ id: "manual-retry" });
    const revalidate = vi.fn(async () => undefined);

    let result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));
    await expect(result.complete(task)).rejects.toBe(failure);
    await settle();
    result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));

    expect(complete).toHaveBeenCalledOnce();
    expect(result.error).toMatchObject({
      title: "Couldn't Update Task",
      canRetry: true,
      refreshRequired: false,
    });

    await result.retry();
    expect(complete).toHaveBeenCalledTimes(2);
    expect(revalidate).not.toHaveBeenCalled();
    await settle();
    result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));
    expect(result.error).toBeUndefined();
  });

  it("clears an older retry action when the user starts a different mutation", async () => {
    const failure = new NetworkError("Unable to reach TickTick.");
    const complete = vi.fn<TaskMutationService["complete"]>().mockRejectedValueOnce(failure);
    const reopen = vi.fn<TaskMutationService["reopen"]>().mockResolvedValue(undefined);
    const service = serviceFixture({ complete, reopen });
    const task = taskFixture({ id: "stale-retry" });

    let result = harness.render(() => useTaskMutation(service, accountKey));
    await expect(result.complete(task)).rejects.toBe(failure);
    await settle();
    result = harness.render(() => useTaskMutation(service, accountKey));
    expect(result.error?.canRetry).toBe(true);

    await result.reopen({ ...task, status: "completed" });
    await settle();
    result = harness.render(() => useTaskMutation(service, accountKey));
    expect(result.error).toBeUndefined();

    await expect(result.retry()).resolves.toBeUndefined();
    expect(complete).toHaveBeenCalledOnce();
    expect(reopen).toHaveBeenCalledOnce();
  });

  it("exposes a safe non-retryable unknown-status presentation for ambiguous mutations", async () => {
    const failure = new AmbiguousMutationError("private upstream detail");
    const update = vi.fn<TaskMutationService["update"]>().mockRejectedValue(failure);
    const service = serviceFixture({ update });
    const task = taskFixture({ id: "ambiguous" });
    const revalidate = vi.fn(async () => undefined);

    let result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));
    await expect(result.update(task, { title: "Requested" })).rejects.toBe(failure);
    await settle();
    result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));

    expect(result.error).toEqual({
      title: "Task Update Status Unknown",
      message: "TickTick may have applied this change. Refresh before trying again.",
      canRetry: false,
      refreshRequired: true,
    });
    await expect(result.retry()).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledOnce();
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it("marks a missing task for refresh without offering a stale mutation retry", async () => {
    const failure = new NotFoundError("The task no longer exists.");
    const move = vi.fn<TaskMutationService["move"]>().mockRejectedValue(failure);
    const service = serviceFixture({ move });
    const task = taskFixture({ id: "missing" });
    const revalidate = vi.fn(async () => undefined);

    let result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));
    await expect(result.move(task, workProject.id)).rejects.toBe(failure);
    await settle();
    result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));

    expect(result.error).toEqual({
      title: "Task No Longer Available",
      message: "This task no longer exists in TickTick. Refresh to update the list.",
      canRetry: false,
      refreshRequired: true,
    });
    expect(move).toHaveBeenCalledOnce();
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it("revalidates exactly once when identical callers coalesce around one refresh-required failure", async () => {
    const gate = deferred<Awaited<ReturnType<TaskMutationService["update"]>>>();
    const update = vi.fn<TaskMutationService["update"]>().mockReturnValue(gate.promise);
    const service = serviceFixture({ update });
    const task = taskFixture({ id: "coalesced-refresh" });
    const patch = { title: "Requested" };
    const revalidate = vi.fn(async () => undefined);
    const result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));

    const first = result.update(task, patch);
    const second = result.update(task, patch);
    gate.reject(new AmbiguousMutationError("private upstream detail"));
    const outcomes = await Promise.allSettled([first, second]);

    expect(outcomes.map((outcome) => outcome.status)).toEqual(["rejected", "rejected"]);
    expect(update).toHaveBeenCalledOnce();
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it.each(["service", "account"] as const)(
    "discards stale retry, error, and pending writes after a %s context switch",
    async (changedContext) => {
      const gate = deferred<void>();
      const complete = vi.fn<TaskMutationService["complete"]>().mockReturnValue(gate.promise);
      const originalService = serviceFixture({ complete });
      const nextService = changedContext === "service" ? serviceFixture() : originalService;
      const nextAccountKey = changedContext === "account" ? `${accountKey}:next` : accountKey;
      const task = taskFixture({ id: `stale-${changedContext}` });

      let result = harness.render(() => useTaskMutation(originalService, accountKey));
      const mutation = result.complete(task);
      result = harness.render(() => useTaskMutation(nextService, nextAccountKey));
      const writesAtSwitch = harness.stateWrites;

      expect(result.error).toBeUndefined();
      expect(result.hasPending).toBe(false);
      gate.reject(new NetworkError("Unable to reach TickTick."));
      await expect(mutation).rejects.toBeInstanceOf(NetworkError);
      await settle();
      result = harness.render(() => useTaskMutation(nextService, nextAccountKey));

      expect(harness.stateWrites).toBe(writesAtSwitch);
      expect(result.error).toBeUndefined();
      expect(result.hasPending).toBe(false);
      await expect(result.retry()).resolves.toBeUndefined();
      expect(complete).toHaveBeenCalledOnce();
    }
  );

  it("does not invoke a stale refresh callback after switching service context", async () => {
    const gate = deferred<Awaited<ReturnType<TaskMutationService["update"]>>>();
    const update = vi.fn<TaskMutationService["update"]>().mockReturnValue(gate.promise);
    const originalService = serviceFixture({ update });
    const nextService = serviceFixture();
    const oldRevalidate = vi.fn(async () => undefined);
    const nextRevalidate = vi.fn(async () => undefined);
    const task = taskFixture({ id: "stale-refresh" });

    let result = harness.render(() =>
      useTaskMutation(originalService, accountKey, { onRefreshRequired: oldRevalidate })
    );
    const mutation = result.update(task, { title: "Unknown" });
    result = harness.render(() => useTaskMutation(nextService, accountKey, { onRefreshRequired: nextRevalidate }));
    const writesAtSwitch = harness.stateWrites;
    gate.reject(new AmbiguousMutationError("private upstream detail"));

    await expect(mutation).rejects.toBeInstanceOf(AmbiguousMutationError);
    await settle();
    expect(harness.stateWrites).toBe(writesAtSwitch);
    expect(oldRevalidate).not.toHaveBeenCalled();
    expect(nextRevalidate).not.toHaveBeenCalled();
    expect(result.error).toBeUndefined();
  });

  it("does not let an old-context action closure arm state in the current service context", async () => {
    const failure = new NetworkError("Unable to reach TickTick.");
    const complete = vi.fn<TaskMutationService["complete"]>().mockRejectedValue(failure);
    const originalService = serviceFixture({ complete });
    const nextService = serviceFixture();
    const task = taskFixture({ id: "stale-handler" });

    const oldResult = harness.render(() => useTaskMutation(originalService, accountKey));
    let currentResult = harness.render(() => useTaskMutation(nextService, accountKey));
    const writesAtSwitch = harness.stateWrites;

    await expect(oldResult.complete(task)).rejects.toBe(failure);
    await settle();
    currentResult = harness.render(() => useTaskMutation(nextService, accountKey));

    expect(complete).toHaveBeenCalledOnce();
    expect(harness.stateWrites).toBe(writesAtSwitch);
    expect(currentResult.error).toBeUndefined();
    expect(currentResult.hasPending).toBe(false);
    await expect(currentResult.retry()).resolves.toBeUndefined();
  });

  it("forwards update and move arguments and returns only confirmed service tasks", async () => {
    const original = taskFixture({ id: "confirmed" });
    const updated = { ...original, title: "Confirmed update" };
    const moved = { ...updated, projectId: workProject.id, projectName: workProject.name };
    const update = vi.fn<TaskMutationService["update"]>().mockResolvedValue(updated);
    const move = vi.fn<TaskMutationService["move"]>().mockResolvedValue(moved);
    const service = serviceFixture({ update, move });

    const result = harness.render(() => useTaskMutation(service, accountKey));

    await expect(result.update(original, { title: "Requested update" })).resolves.toEqual(updated);
    await expect(result.move(updated, workProject.id)).resolves.toEqual(moved);
    expect(update).toHaveBeenCalledWith(accountKey, original, { title: "Requested update" });
    expect(move).toHaveBeenCalledWith(accountKey, updated, workProject.id);
  });

  it("never writes hook state after unmount when a mutation resolves late", async () => {
    const gate = deferred<void>();
    const complete = vi.fn<TaskMutationService["complete"]>().mockReturnValue(gate.promise);
    const service = serviceFixture({ complete });
    const task = taskFixture({ id: "late" });

    const result = harness.render(() => useTaskMutation(service, accountKey));
    const mutation = result.complete(task);
    harness.unmount();
    gate.resolve();
    await mutation;
    await settle();

    expect(harness.updatesAfterUnmount).toBe(0);
  });

  it("does not write state or trigger revalidation when a refresh-required failure arrives after unmount", async () => {
    const gate = deferred<Awaited<ReturnType<TaskMutationService["update"]>>>();
    const update = vi.fn<TaskMutationService["update"]>().mockReturnValue(gate.promise);
    const service = serviceFixture({ update });
    const task = taskFixture({ id: "late-ambiguous" });
    const revalidate = vi.fn(async () => undefined);

    const result = harness.render(() => useTaskMutation(service, accountKey, { onRefreshRequired: revalidate }));
    const mutation = result.update(task, { title: "Unknown" });
    harness.unmount();
    gate.reject(new AmbiguousMutationError("private upstream detail"));
    await expect(mutation).rejects.toBeInstanceOf(AmbiguousMutationError);
    await settle();

    expect(harness.updatesAfterUnmount).toBe(0);
    expect(revalidate).not.toHaveBeenCalled();
  });
});
