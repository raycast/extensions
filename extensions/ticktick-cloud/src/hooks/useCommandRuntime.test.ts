import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type {
  CommandRuntimeBootstrap,
  CommandRuntimeController,
  CommandRuntimeState,
  ReadyCommandRuntimeInput,
} from "../application/commandRuntime";
import { ProtocolError } from "../domain/errors";
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

  abandonRender<T>(hook: () => T): T {
    const committedSlots = this.slots.map((slot) => (slot.kind === "state" ? { ...slot } : slot));
    const committedLayoutEffects = this.pendingLayoutEffects.slice();
    const committedEffects = this.pendingEffects.slice();
    const committedStateWrites = this.stateWrites;
    try {
      return this.renderWithoutEffects(hook);
    } finally {
      this.slots = committedSlots;
      this.pendingLayoutEffects = committedLayoutEffects;
      this.pendingEffects = committedEffects;
      this.stateWrites = committedStateWrites;
      this.cursor = 0;
    }
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

  flushLayoutEffects(): void {
    const pendingLayouts = this.pendingLayoutEffects;
    this.pendingLayoutEffects = [];
    for (const { index, effect, dependencies } of pendingLayouts) {
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
    for (const effect of layouts) {
      const cleanup = effect.setup();
      effect.cleanup = cleanup || undefined;
    }
    for (const effect of effects) {
      const cleanup = effect.setup();
      effect.cleanup = cleanup || undefined;
    }
  }

  unmount(): void {
    this.unmounted = true;
    for (const slot of this.slots) {
      if (slot.kind === "layoutEffect") slot.cleanup?.();
    }
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
  for (let index = 0; index < 15; index += 1) await Promise.resolve();
}

function backend(id: TickTickBackend["id"] = "mcp"): TickTickBackend {
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
    listProjects: async () => [],
    queryTasks: async () => ({ tasks: [], failedProjectIds: [] }),
    createTask: async () => {
      throw new Error("unused");
    },
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

function runtimeInput(
  backendId: TickTickBackend["id"],
  accountKey: string,
  overrides: Partial<ReadyCommandRuntimeInput> = {}
): ReadyCommandRuntimeInput {
  return {
    backend: backend(backendId),
    accountKey,
    repository: new TaskRepository(new InMemoryCachePort()),
    ...overrides,
  };
}

let harness = new HookHarness();
let useCommandRuntime: typeof import("./useCommandRuntime").useCommandRuntime;
const controllerDisposals: Array<ReturnType<typeof vi.fn>> = [];

beforeAll(async () => {
  vi.doMock("react", () => ({
    useState: <T>(initial: T | (() => T)) => harness.useState(initial),
    useRef: <T>(initial: T) => harness.useRef(initial),
    useLayoutEffect: (effect: Effect, dependencies: readonly unknown[]) =>
      harness.useLayoutEffect(effect, dependencies),
    useEffect: (effect: Effect, dependencies: readonly unknown[]) => harness.useEffect(effect, dependencies),
  }));
  vi.doMock("../application/commandRuntime", async () => {
    const actual = await vi.importActual<typeof import("../application/commandRuntime")>(
      "../application/commandRuntime"
    );
    return {
      ...actual,
      createCommandRuntimeController(publish: (state: CommandRuntimeState) => void): CommandRuntimeController {
        const controller = actual.createCommandRuntimeController(publish);
        const dispose = vi.fn(() => controller.dispose());
        controllerDisposals.push(dispose);
        return { load: (bootstrap: CommandRuntimeBootstrap) => controller.load(bootstrap), dispose };
      },
    };
  });
  ({ useCommandRuntime } = await import("./useCommandRuntime"));
});

beforeEach(() => {
  harness = new HookHarness();
  controllerDisposals.length = 0;
});

afterAll(() => {
  vi.doUnmock("react");
  vi.doUnmock("../application/commandRuntime");
  vi.resetModules();
});

describe("useCommandRuntime", () => {
  it("exposes the backend-neutral hook contract", () => {
    expectTypeOf(useCommandRuntime).toBeFunction();
    expectTypeOf(useCommandRuntime).parameter(0).toEqualTypeOf<CommandRuntimeBootstrap>();
    expectTypeOf(useCommandRuntime).parameter(1).toEqualTypeOf<string>();
    expectTypeOf(useCommandRuntime).returns.toEqualTypeOf<CommandRuntimeState>();
  });

  it("returns loading immediately and publishes one ready runtime from one bootstrap", async () => {
    const pending = deferred<ReadyCommandRuntimeInput>();
    const bootstrap = vi.fn(() => pending.promise);

    let result = harness.render(() => useCommandRuntime(bootstrap, "context-a"));
    expect(result).toEqual({ kind: "loading" });
    expect(bootstrap).toHaveBeenCalledTimes(1);

    pending.resolve(runtimeInput("mcp", "account-a"));
    await settle();
    result = harness.render(() => useCommandRuntime(bootstrap, "context-a"));

    expect(result).toMatchObject({ kind: "ready", backendId: "mcp", accountKey: "account-a" });
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });

  it("returns loading synchronously on a context switch and starts exactly one replacement load", async () => {
    const bootstrapA = vi.fn(async () => runtimeInput("mcp", "account-a"));
    const pendingB = deferred<ReadyCommandRuntimeInput>();
    const bootstrapB = vi.fn(() => pendingB.promise);

    harness.render(() => useCommandRuntime(bootstrapA, "context-a"));
    await settle();
    let result = harness.render(() => useCommandRuntime(bootstrapA, "context-a"));
    expect(result).toMatchObject({ kind: "ready", accountKey: "account-a" });

    result = harness.renderWithoutEffects(() => useCommandRuntime(bootstrapB, "context-b"));
    expect(result).toEqual({ kind: "loading" });
    expect(bootstrapB).not.toHaveBeenCalled();

    harness.flushEffects();
    harness.render(() => useCommandRuntime(bootstrapB, "context-b"));
    expect(bootstrapB).toHaveBeenCalledTimes(1);

    pendingB.resolve(runtimeInput("openapi", "account-b"));
    await settle();
    result = harness.render(() => useCommandRuntime(bootstrapB, "context-b"));
    expect(result).toMatchObject({ kind: "ready", backendId: "openapi", accountKey: "account-b" });
    expect(bootstrapB).toHaveBeenCalledTimes(1);
  });

  it("keeps committed A live when React abandons an in-progress B render", async () => {
    const pendingA = deferred<ReadyCommandRuntimeInput>();
    const bootstrapA = vi.fn(() => pendingA.promise);
    const bootstrapB = vi.fn(async () => runtimeInput("openapi", "abandoned-b"));

    harness.render(() => useCommandRuntime(bootstrapA, "context-a"));
    const abandoned = harness.abandonRender(() => useCommandRuntime(bootstrapB, "context-b"));
    expect(abandoned).toEqual({ kind: "loading" });

    pendingA.resolve(runtimeInput("mcp", "committed-a"));
    await settle();
    const result = harness.render(() => useCommandRuntime(bootstrapA, "context-a"));

    expect(result).toMatchObject({ kind: "ready", backendId: "mcp", accountKey: "committed-a" });
    expect(bootstrapA).toHaveBeenCalledTimes(1);
    expect(bootstrapB).not.toHaveBeenCalled();
    expect(controllerDisposals).toHaveLength(1);
    expect(controllerDisposals[0]).not.toHaveBeenCalled();
  });

  it("uses the latest bootstrap before setup without reloading for callback identity churn", async () => {
    const staleBootstrap = vi.fn(async () => runtimeInput("mcp", "stale-account"));
    const latestBootstrap = vi.fn(async () => runtimeInput("openapi", "latest-account"));

    harness.renderWithoutEffects(() => useCommandRuntime(staleBootstrap, "stable-context"));
    let result = harness.renderWithoutEffects(() => useCommandRuntime(latestBootstrap, "stable-context"));
    expect(result).toEqual({ kind: "loading" });
    harness.flushEffects();
    await settle();

    result = harness.render(() =>
      useCommandRuntime(async () => runtimeInput("mcp", "per-render-identity"), "stable-context")
    );

    expect(staleBootstrap).not.toHaveBeenCalled();
    expect(latestBootstrap).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ kind: "ready", backendId: "openapi", accountKey: "latest-account" });
  });

  it("blocks stale result and error publications across A to B to A generations", async () => {
    const firstA = deferred<ReadyCommandRuntimeInput>();
    const pendingB = deferred<ReadyCommandRuntimeInput>();
    const secondA = deferred<ReadyCommandRuntimeInput>();
    const oldReconnect = vi.fn();
    const currentReconnect = vi.fn();
    const bootstrapFirstA = vi.fn(() => firstA.promise);
    const bootstrapB = vi.fn(() => pendingB.promise);
    const bootstrapSecondA = vi.fn(() => secondA.promise);

    harness.render(() => useCommandRuntime(bootstrapFirstA, "context-a"));
    let result = harness.renderWithoutEffects(() => useCommandRuntime(bootstrapB, "context-b"));
    expect(result).toEqual({ kind: "loading" });
    harness.flushLayoutEffects();
    const writesBeforeOldResult = harness.stateWrites;

    firstA.resolve(runtimeInput("mcp", "account-old-a", { onReconnect: oldReconnect }));
    await settle();
    expect(harness.stateWrites).toBe(writesBeforeOldResult);

    harness.flushEffects();
    result = harness.renderWithoutEffects(() => useCommandRuntime(bootstrapSecondA, "context-a"));
    expect(result).toEqual({ kind: "loading" });
    harness.flushLayoutEffects();
    const writesBeforeOldError = harness.stateWrites;

    pendingB.reject(new Error("PRIVATE stale B error"));
    await settle();
    expect(harness.stateWrites).toBe(writesBeforeOldError);

    harness.flushEffects();
    secondA.resolve(runtimeInput("openapi", "account-current-a", { onReconnect: currentReconnect }));
    await settle();
    result = harness.render(() => useCommandRuntime(bootstrapSecondA, "context-a"));

    expect(result).toMatchObject({ kind: "ready", backendId: "openapi", accountKey: "account-current-a" });
    if (result.kind !== "ready") throw new Error("expected ready state");
    expect(result.onReconnect).toBe(currentReconnect);
    expect(result.onReconnect).not.toBe(oldReconnect);
    expect(bootstrapFirstA).toHaveBeenCalledTimes(1);
    expect(bootstrapB).toHaveBeenCalledTimes(1);
    expect(bootstrapSecondA).toHaveBeenCalledTimes(1);
  });

  it("survives a Strict Effects cleanup and setup cycle without duplicating bootstrap", async () => {
    const pending = deferred<ReadyCommandRuntimeInput>();
    const bootstrap = vi.fn(() => pending.promise);

    harness.render(() => useCommandRuntime(bootstrap, "strict-context"));
    harness.strictEffectsCycle();

    expect(bootstrap).toHaveBeenCalledTimes(1);
    expect(controllerDisposals).toHaveLength(1);
    expect(controllerDisposals[0]).not.toHaveBeenCalled();

    pending.resolve(runtimeInput("mcp", "strict-account"));
    await settle();
    const result = harness.render(() => useCommandRuntime(bootstrap, "strict-context"));
    expect(result).toMatchObject({ kind: "ready", accountKey: "strict-account" });
  });

  it("blocks an already-queued publication on unmount and disposes its controller", async () => {
    const bootstrap = vi.fn(async () => runtimeInput("mcp", "unmounted-account"));

    harness.render(() => useCommandRuntime(bootstrap, "unmount-context"));
    harness.unmount();
    await settle();

    expect(harness.updatesAfterUnmount).toBe(0);
    expect(controllerDisposals).toHaveLength(1);
    expect(controllerDisposals[0]).toHaveBeenCalledTimes(1);
  });

  it("returns a fixed error and never bootstraps an invalid semantic context", () => {
    const bootstrap = vi.fn(async () => runtimeInput("mcp", "must-not-load"));

    const result = harness.render(() => useCommandRuntime(bootstrap, ""));

    expect(result).toEqual({
      kind: "error",
      error: new ProtocolError("TickTick command runtime context is invalid."),
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(bootstrap).not.toHaveBeenCalled();
    expect(controllerDisposals).toHaveLength(0);
  });

  it("keeps the shared invalid-context error immutable across renders", () => {
    const bootstrap = vi.fn(async () => runtimeInput("mcp", "must-not-load"));
    const first = harness.render(() => useCommandRuntime(bootstrap, ""));
    expect(first.kind).toBe("error");
    if (first.kind !== "error") throw new Error("expected error state");

    expect(Object.isFrozen(first.error)).toBe(true);
    expect(() => Object.assign(first.error as object, { message: "PRIVATE poisoned error" })).toThrow(TypeError);

    const second = harness.render(() => useCommandRuntime(bootstrap, " "));
    expect(second).toEqual({
      kind: "error",
      error: new ProtocolError("TickTick command runtime context is invalid."),
    });
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it.each([
    ["leading whitespace", " context"],
    ["trailing whitespace", "context "],
    ["C0 control", "context\u0000key"],
    ["C1 control", "context\u007fkey"],
    ["format character", "context\u200bkey"],
    ["lone high surrogate", "context-\ud800"],
    ["lone low surrogate", "context-\udc00"],
  ])("rejects a semantic context containing %s without bootstrapping", (_case, contextKey) => {
    const bootstrap = vi.fn(async () => runtimeInput("mcp", "must-not-load"));

    const result = harness.render(() => useCommandRuntime(bootstrap, contextKey));

    expect(result).toEqual({
      kind: "error",
      error: new ProtocolError("TickTick command runtime context is invalid."),
    });
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it("does not inspect a hostile context value and keeps hook order stable when a valid Unicode context follows", async () => {
    let inspected = 0;
    const hostileContext = new Proxy(Object.create(null) as object, {
      get() {
        inspected += 1;
        throw new Error("PRIVATE hostile context getter");
      },
    }) as unknown as string;
    const bootstrap = vi.fn(async () => runtimeInput("mcp", "unicode-account"));

    let result = harness.render(() => useCommandRuntime(bootstrap, hostileContext));
    expect(result).toEqual({
      kind: "error",
      error: new ProtocolError("TickTick command runtime context is invalid."),
    });
    expect(inspected).toBe(0);
    expect(bootstrap).not.toHaveBeenCalled();

    result = harness.render(() => useCommandRuntime(bootstrap, "context-résumé-😀"));
    expect(result).toEqual({ kind: "loading" });
    await settle();
    result = harness.render(() => useCommandRuntime(bootstrap, "context-résumé-😀"));
    expect(result).toMatchObject({ kind: "ready", accountKey: "unicode-account" });
    expect(bootstrap).toHaveBeenCalledTimes(1);
    expect(inspected).toBe(0);
  });

  it("preserves an unknown bootstrap error without inspecting or stringifying it", async () => {
    let inspected = 0;
    const marker = Object.defineProperties(Object.create(null), {
      message: {
        get() {
          inspected += 1;
          throw new Error("PRIVATE message getter");
        },
      },
      toString: {
        get() {
          inspected += 1;
          throw new Error("PRIVATE stringifier getter");
        },
      },
      toJSON: {
        get() {
          inspected += 1;
          throw new Error("PRIVATE serializer getter");
        },
      },
    });
    const bootstrap = vi.fn(() => Promise.reject(marker));

    harness.render(() => useCommandRuntime(bootstrap, "error-context"));
    await settle();
    const result = harness.render(() => useCommandRuntime(bootstrap, "error-context"));

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error state");
    expect(result.error).toBe(marker);
    expect(Object.isFrozen(result)).toBe(true);
    expect(inspected).toBe(0);
  });

  it("has no concrete backend, authentication, Raycast, storage, network, legacy, retry, or error-inspection dependency", () => {
    const source = readFileSync(resolve(__dirname, "useCommandRuntime.ts"), "utf8");

    expect(source).not.toMatch(
      /McpTickTickBackend|OpenApiTickTickBackend|MacOsAppleScriptBackend|BackendFactory|AuthProvider|@raycast\/api|LocalStorage|run-applescript|\bfetch\b|console\.|setTimeout|retry|JSON\.stringify|String\(|\.toString\(|\.message\b/
    );
    expect(source).not.toMatch(/infrastructure\/(?:mcp|openapi|macos)|Task8/);
  });
});
