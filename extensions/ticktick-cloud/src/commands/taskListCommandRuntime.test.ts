import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  createReadyCommandRuntime,
  type CommandRuntimeState,
  type ReadyCommandRuntime,
} from "../application/commandRuntime";
import { AuthenticationError, NetworkError } from "../domain/errors";
import type { Task } from "../domain/task";
import type { TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { TaskRepository } from "../infrastructure/cache/TaskRepository";
import { InMemoryCachePort } from "../test/fakes/InMemoryCachePort";
import type { TaskListRuntime } from "../components/TaskListView";
import type { TaskExactLinkStrategy } from "../components/taskActions";
import { projectTaskListCommandRuntime, type TaskListCommandRuntimeOptions } from "./taskListCommandRuntime";

const DENVER = "America/Denver";

const confirmedTask: Task = Object.freeze({
  id: "task-id",
  projectId: "project-id",
  projectName: "Project",
  title: "Synthetic task",
  status: "open",
  priority: 0,
  tags: Object.freeze([]) as unknown as string[],
  kind: "TEXT",
  isAllDay: false,
  isFloating: true,
  timeZone: DENVER,
});

function backend(overrides: Partial<TickTickBackend> = {}): TickTickBackend {
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
    accountIdentity: vi.fn(async () => undefined),
    listProjects: vi.fn(async () => []),
    queryTasks: vi.fn(async () => ({ tasks: [], failedProjectIds: [] })),
    createTask: vi.fn(async () => confirmedTask),
    updateTask: vi.fn(async () => confirmedTask),
    completeTask: vi.fn(async () => undefined),
    reopenTask: vi.fn(async () => undefined),
    moveTask: vi.fn(async () => confirmedTask),
    ...overrides,
  };
}

function runtime(
  source: TickTickBackend = backend(),
  recovery: Readonly<{ onReconnect?: () => void; onOpenPreferences?: () => void }> = {}
): ReadyCommandRuntime {
  return createReadyCommandRuntime({
    backend: source,
    accountKey: "oauth:account-a",
    repository: new TaskRepository(new InMemoryCachePort()),
    ...recovery,
  });
}

function options(overrides: Partial<TaskListCommandRuntimeOptions> = {}): TaskListCommandRuntimeOptions {
  return {
    uiTimeZone: DENVER,
    exactLinkStrategy: undefined,
    ...overrides,
  };
}

function expectFixedProtocolError(result: TaskListRuntime): void {
  expect(result).toEqual({
    kind: "error",
    presentation: {
      kind: "protocol",
      title: "Unsupported TickTick Response",
      message: "TickTick returned data this extension could not safely process.",
      severity: "error",
      retainData: true,
      actions: [{ kind: "refresh", title: "Refresh" }],
    },
  });
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
}

describe("projectTaskListCommandRuntime", () => {
  it("exposes the exact pure projection contract", () => {
    expectTypeOf(projectTaskListCommandRuntime).toBeFunction();
    expectTypeOf(projectTaskListCommandRuntime).parameter(0).toEqualTypeOf<CommandRuntimeState>();
    expectTypeOf(projectTaskListCommandRuntime).parameter(1).toEqualTypeOf<TaskListCommandRuntimeOptions>();
    expectTypeOf(projectTaskListCommandRuntime).returns.toEqualTypeOf<TaskListRuntime>();
    expectTypeOf<TaskListCommandRuntimeOptions>().toEqualTypeOf<
      Readonly<{ uiTimeZone: string; exactLinkStrategy: TaskExactLinkStrategy }>
    >();
  });

  it("projects one trusted ready runtime into the exact frozen task-list view boundary without executing work", () => {
    const source = backend();
    const onReconnect = vi.fn();
    const onOpenPreferences = vi.fn();
    const accepted = runtime(source, { onReconnect, onOpenPreferences });

    const projected = projectTaskListCommandRuntime(accepted, options({ exactLinkStrategy: "native-project-uri" }));

    expect(projected).toEqual({
      kind: "ready",
      accountKey: accepted.accountKey,
      taskService: accepted.taskService,
      mutationService: accepted.mutationService,
      capabilities: accepted.capabilities,
      uiTimeZone: DENVER,
      exactLinkStrategy: "native-project-uri",
      onReconnect,
      onOpenPreferences,
    });
    expect(Object.keys(projected).sort()).toEqual([
      "accountKey",
      "capabilities",
      "exactLinkStrategy",
      "kind",
      "mutationService",
      "onOpenPreferences",
      "onReconnect",
      "taskService",
      "uiTimeZone",
    ]);
    expect(Object.isFrozen(projected)).toBe(true);
    expect(projected).not.toHaveProperty("backendId");
    expect(projected).not.toHaveProperty("contextKey");
    expect(projected).not.toHaveProperty("creationService");
    expect(onReconnect).not.toHaveBeenCalled();
    expect(onOpenPreferences).not.toHaveBeenCalled();
    expect(source.accountIdentity).not.toHaveBeenCalled();
    expect(source.listProjects).not.toHaveBeenCalled();
    expect(source.queryTasks).not.toHaveBeenCalled();
    expect(source.createTask).not.toHaveBeenCalled();
    expect(source.updateTask).not.toHaveBeenCalled();
    expect(source.completeTask).not.toHaveBeenCalled();
    expect(source.reopenTask).not.toHaveBeenCalled();
    expect(source.moveTask).not.toHaveBeenCalled();
  });

  it("reads each ready-only option exactly once without mutating or aliasing the input", () => {
    const accepted = runtime();
    const reads = { uiTimeZone: 0, exactLinkStrategy: 0 };
    const source = Object.defineProperties(
      {},
      {
        uiTimeZone: {
          get() {
            reads.uiTimeZone += 1;
            if (reads.uiTimeZone > 1) throw new Error("PRIVATE repeated timezone read");
            return DENVER;
          },
        },
        exactLinkStrategy: {
          get() {
            reads.exactLinkStrategy += 1;
            if (reads.exactLinkStrategy > 1) throw new Error("PRIVATE repeated strategy read");
            return undefined;
          },
        },
      }
    ) as TaskListCommandRuntimeOptions;

    const projected = projectTaskListCommandRuntime(accepted, source);

    expect(projected).toMatchObject({ kind: "ready", uiTimeZone: DENVER, exactLinkStrategy: undefined });
    expect(reads).toEqual({ uiTimeZone: 1, exactLinkStrategy: 1 });
    expect(Object.isFrozen(source)).toBe(false);
  });

  it("returns one frozen loading state without touching ready-only options", () => {
    const reads = { uiTimeZone: 0, exactLinkStrategy: 0 };
    const hostile = hostileOptions(reads);

    const first = projectTaskListCommandRuntime(Object.freeze({ kind: "loading" }), hostile);
    const second = projectTaskListCommandRuntime(Object.freeze({ kind: "loading" }), hostile);

    expect(first).toEqual({ kind: "loading" });
    expect(second).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(reads).toEqual({ uiTimeZone: 0, exactLinkStrategy: 0 });
  });

  it.each([
    [
      "authentication",
      new AuthenticationError("PRIVATE expired token"),
      {
        kind: "authentication",
        title: "Reconnect TickTick",
        message: "Your TickTick connection is no longer valid. Reconnect or update authentication in preferences.",
        severity: "error",
        retainData: true,
        actions: [
          { kind: "reconnect", title: "Reconnect" },
          { kind: "open-preferences", title: "Open Preferences" },
        ],
      },
    ],
    [
      "network",
      new NetworkError("PRIVATE network detail"),
      {
        kind: "network",
        title: "TickTick Is Unreachable",
        message: "Couldn't reach TickTick. Available tasks may be out of date.",
        severity: "error",
        retainData: true,
        actions: [{ kind: "refresh", title: "Refresh" }],
      },
    ],
  ] as const)(
    "safely presents a raw %s bootstrap error without reading ready-only options",
    (_case, error, presentation) => {
      const reads = { uiTimeZone: 0, exactLinkStrategy: 0 };

      const projected = projectTaskListCommandRuntime(Object.freeze({ kind: "error", error }), hostileOptions(reads));

      expect(projected).toEqual({ kind: "error", presentation });
      expect(projected).not.toHaveProperty("recovery");
      expect(Object.isFrozen(projected)).toBe(true);
      if (projected.kind !== "error") throw new Error("expected error runtime");
      expect(Object.isFrozen(projected.presentation)).toBe(true);
      expect(Object.isFrozen(projected.presentation.actions)).toBe(true);
      expect(projected.presentation.actions.every(Object.isFrozen)).toBe(true);
      expect(JSON.stringify(projected)).not.toContain("PRIVATE");
      expect(reads).toEqual({ uiTimeZone: 0, exactLinkStrategy: 0 });
    }
  );

  it("reads an error payload once and never inspects or stringifies an unknown hostile error", () => {
    let errorReads = 0;
    let privateReads = 0;
    const privateError = Object.defineProperties(Object.create(null), {
      message: {
        get() {
          privateReads += 1;
          throw new Error("PRIVATE message getter");
        },
      },
      toString: {
        get() {
          privateReads += 1;
          throw new Error("PRIVATE stringifier getter");
        },
      },
      toJSON: {
        get() {
          privateReads += 1;
          throw new Error("PRIVATE serializer getter");
        },
      },
    });
    const state = Object.defineProperties(
      {},
      {
        kind: { value: "error" },
        error: {
          get() {
            errorReads += 1;
            if (errorReads > 1) throw new Error("PRIVATE repeated error read");
            return privateError;
          },
        },
      }
    ) as CommandRuntimeState;

    const projected = projectTaskListCommandRuntime(state, options());

    expect(projected).toEqual({
      kind: "error",
      presentation: {
        kind: "unknown",
        title: "Something Went Wrong",
        message: "TickTick couldn't complete the request.",
        severity: "error",
        retainData: true,
        actions: [],
      },
    });
    expect(errorReads).toBe(1);
    expect(privateReads).toBe(0);
  });

  it.each([undefined, "backend-url", "native-project-uri"] as const)(
    "passes the explicitly injected %s exact-link policy through without choosing a fallback",
    (exactLinkStrategy) => {
      const capabilities = {
        create: false,
        update: false,
        complete: false,
        reopen: false,
        move: false,
        completedQuery: false,
        inboxQuery: false,
        exactTaskLink: false,
      } as const;
      const accepted = runtime(backend({ capabilities: () => capabilities }));

      const projected = projectTaskListCommandRuntime(accepted, options({ exactLinkStrategy }));

      expect(projected).toMatchObject({ kind: "ready", capabilities, exactLinkStrategy });
      if (projected.kind !== "ready") throw new Error("expected ready runtime");
      expect(projected.capabilities).toBe(accepted.capabilities);
    }
  );

  it.each(["UTC", "America/Denver", "Australia/Lord_Howe"])("accepts the injected IANA timezone %s", (uiTimeZone) => {
    const projected = projectTaskListCommandRuntime(runtime(), options({ uiTimeZone }));

    expect(projected).toMatchObject({ kind: "ready", uiTimeZone });
  });

  it.each(["", " UTC", "UTC ", "PRIVATE/not-a-zone", "UTC\u0000", "UTC\u200b", "UTC-\ud800"])(
    "fails the unsafe or non-IANA timezone %j closed",
    (uiTimeZone) => {
      const projected = projectTaskListCommandRuntime(runtime(), options({ uiTimeZone }));

      expectFixedProtocolError(projected);
    }
  );

  it("fails an invalid or hostile exact-link policy closed without leaking its value", () => {
    const accepted = runtime();
    const invalid = projectTaskListCommandRuntime(
      accepted,
      options({ exactLinkStrategy: "PRIVATE-fallback" as TaskExactLinkStrategy })
    );
    const hostile = Object.defineProperties(
      { uiTimeZone: DENVER },
      {
        exactLinkStrategy: {
          get() {
            throw new Error("PRIVATE strategy getter");
          },
        },
      }
    ) as TaskListCommandRuntimeOptions;

    expectFixedProtocolError(invalid);
    expectFixedProtocolError(projectTaskListCommandRuntime(accepted, hostile));
  });

  it("rejects forged, hostile, and revoked ready-shaped values before touching ready-only options", () => {
    const accepted = runtime();
    const forged = { ...accepted } as ReadyCommandRuntime;
    const privateReads = { uiTimeZone: 0, exactLinkStrategy: 0 };
    const hostileRuntime = Object.defineProperty({}, "kind", {
      get() {
        throw new Error("PRIVATE runtime discriminant");
      },
    }) as CommandRuntimeState;
    const revoked = Proxy.revocable(accepted, {});
    revoked.revoke();

    for (const candidate of [forged, hostileRuntime, revoked.proxy]) {
      expectFixedProtocolError(
        projectTaskListCommandRuntime(candidate as CommandRuntimeState, hostileOptions(privateReads))
      );
    }
    expect(privateReads).toEqual({ uiTimeZone: 0, exactLinkStrategy: 0 });
  });

  it("projects current policy values on each invocation while preserving authority service identities", () => {
    const accepted = runtime();

    const first = projectTaskListCommandRuntime(accepted, options({ uiTimeZone: "UTC" }));
    const second = projectTaskListCommandRuntime(
      accepted,
      options({ uiTimeZone: DENVER, exactLinkStrategy: "backend-url" })
    );

    expect(first).toMatchObject({ kind: "ready", uiTimeZone: "UTC", exactLinkStrategy: undefined });
    expect(second).toMatchObject({ kind: "ready", uiTimeZone: DENVER, exactLinkStrategy: "backend-url" });
    if (first.kind !== "ready" || second.kind !== "ready") throw new Error("expected ready runtimes");
    expect(second.taskService).toBe(first.taskService);
    expect(second.mutationService).toBe(first.mutationService);
    expect(second.accountKey).toBe(first.accountKey);
  });

  it("keeps the production slice free of entrypoints, UI adapters, concrete backends, legacy, storage, network, timers, and link decisions", () => {
    const source = readFileSync(resolve(__dirname, "taskListCommandRuntime.ts"), "utf8");

    expect(source).not.toMatch(
      /@raycast\/api|BackendFactory|McpTickTickBackend|OpenApiTickTickBackend|MacOsAppleScriptBackend|run-applescript|LocalStorage|\bfetch\b|XMLHttpRequest|WebSocket|console\.|setTimeout|setInterval|taskLinkDecision|Task8/i
    );
    expect(source).not.toMatch(
      /\.\.\/(?:index|next7Days|inbox|search|service|platform|infrastructure\/(?:mcp|openapi|macos))/
    );
    expect(source).not.toMatch(/projectTaskCreationRuntime|creationService|createTask\s*\(/);
  });
});

function hostileOptions(reads: { uiTimeZone: number; exactLinkStrategy: number }): TaskListCommandRuntimeOptions {
  return Object.defineProperties(
    {},
    {
      uiTimeZone: {
        get() {
          reads.uiTimeZone += 1;
          throw new Error("PRIVATE timezone getter");
        },
      },
      exactLinkStrategy: {
        get() {
          reads.exactLinkStrategy += 1;
          throw new Error("PRIVATE strategy getter");
        },
      },
    }
  ) as TaskListCommandRuntimeOptions;
}
