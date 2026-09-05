import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { AmbiguousMutationError, NetworkError, RateLimitError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { CreateTaskInput, Task } from "../domain/task";
import type { TaskDestinationPreferencePort } from "../application/taskDestination";
import {
  createAddTaskTool,
  createGetListsTool,
  createGetTasksTool,
  type AiToolControllerDependencies,
  type AiToolRuntime,
} from "./toolController";

const accountKey = "oauth:00000000-0000-4000-8000-000000000001";

const inboxProject: Project = Object.freeze({
  id: "project-inbox",
  name: "Inbox",
  kind: "inbox",
  closed: false,
});

const workProject: Project = Object.freeze({
  id: "project-work",
  name: "Work Projects",
  kind: "project",
  closed: false,
});

const duplicateWorkProject: Project = Object.freeze({
  id: "project-work-two",
  name: workProject.name,
  kind: "project",
  closed: false,
});

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-default",
    projectId: inboxProject.id,
    projectName: inboxProject.name,
    title: "Synthetic task",
    status: "open",
    priority: 0,
    tags: [],
    kind: "TEXT",
    isAllDay: false,
    isFloating: false,
    timeZone: "UTC",
    ...overrides,
  };
}

function taskReadModel(overrides: Record<string, unknown> = {}): unknown {
  return {
    projects: [inboxProject, workProject],
    tasks: [],
    sections: [],
    freshness: "fresh",
    fetchedAt: 1_000_000,
    isPartial: false,
    failedProjectIds: [],
    ...overrides,
  };
}

function preferencePort(value: unknown = undefined): TaskDestinationPreferencePort {
  return {
    load: vi.fn(async () => value as string | undefined),
    remember: vi.fn(async () => undefined),
  };
}

function runtime(
  overrides: Partial<{
    backendId: unknown;
    accountKey: unknown;
    capabilities: unknown;
    query: AiToolRuntime["taskService"]["query"];
    listProjects: AiToolRuntime["taskService"]["listProjects"];
    createTask: (input: CreateTaskInput) => Promise<unknown>;
  }> = {}
): AiToolRuntime {
  return {
    backendId: (overrides.backendId ?? "mcp") as AiToolRuntime["backendId"],
    accountKey: (overrides.accountKey ?? accountKey) as string,
    capabilities: (overrides.capabilities ?? { create: true }) as AiToolRuntime["capabilities"],
    taskService: {
      query: overrides.query ?? vi.fn(async () => taskReadModel()),
      listProjects: overrides.listProjects ?? vi.fn(async () => [inboxProject, workProject]),
    },
    createTask:
      overrides.createTask ??
      vi.fn(async (input: CreateTaskInput) =>
        task({ ...input, projectId: input.projectId ?? inboxProject.id, projectName: inboxProject.name })
      ),
  };
}

function dependencies(
  overrides: Partial<{
    runtime: AiToolRuntime;
    loadRuntime: AiToolControllerDependencies["loadRuntime"];
    preferences: TaskDestinationPreferencePort;
  }> = {}
): AiToolControllerDependencies {
  const value = overrides.runtime ?? runtime();
  return {
    loadRuntime: overrides.loadRuntime ?? vi.fn(async () => value),
    preferences: overrides.preferences ?? preferencePort(),
  };
}

function errorResult(result: unknown): Record<string, unknown> {
  expect(result).toMatchObject({ ok: false, error: expect.any(Object) });
  return (result as { error: Record<string, unknown> }).error;
}

function deferred<Value>() {
  let resolvePromise!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise_) => {
    resolvePromise = resolvePromise_;
  });
  return { promise, resolve: resolvePromise };
}

describe("createGetTasksTool", () => {
  it.each([
    ["today", "today"],
    ["next7Days", "next7Days"],
  ] as const)("maps %s to one open application query", async (smartProjectId, view) => {
    const query = vi.fn(async () => taskReadModel());
    const loadRuntime = vi.fn(async () => runtime({ query }));

    const result = await createGetTasksTool(dependencies({ loadRuntime }))({ smartProjectId });

    expect(result).toEqual({
      ok: true,
      data: { view, freshness: "fresh", partial: false, sections: [] },
    });
    expect(loadRuntime).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledWith(accountKey, { view, status: "open" });
  });

  it("preserves Today sections while projecting only the intended task fields", async () => {
    const privateMarkers = {
      id: "private-task-id",
      projectId: "private-project-id",
      content: "private-content",
      description: "private-description",
      tag: "private-tag",
      exactUrl: "https://private.invalid/task",
    };
    const sourceTask = task({
      id: privateMarkers.id,
      projectId: privateMarkers.projectId,
      projectName: "Work Projects",
      title: "Buy oat milk",
      startDate: "2026-08-14T08:00:00-06:00",
      dueDate: "2026-08-14T09:00:00-06:00",
      isAllDay: false,
      isFloating: true,
      timeZone: "America/Denver",
      priority: 3,
      content: privateMarkers.content,
      description: privateMarkers.description,
      tags: [privateMarkers.tag],
      exactUrl: privateMarkers.exactUrl,
    });
    const model = taskReadModel({
      sections: [
        { id: "overdue", title: "Overdue", tasks: [sourceTask] },
        { id: "today", title: "Today", tasks: [task({ id: "today-task", title: "Call dentist" })] },
      ],
    });
    const result = await createGetTasksTool(dependencies({ runtime: runtime({ query: vi.fn(async () => model) }) }))({
      smartProjectId: "today",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        view: "today",
        freshness: "fresh",
        partial: false,
        sections: [
          {
            id: "overdue",
            title: "Overdue",
            tasks: [
              {
                title: "Buy oat milk",
                listName: "Work Projects",
                startDate: "2026-08-14T08:00:00-06:00",
                dueDate: "2026-08-14T09:00:00-06:00",
                isAllDay: false,
                isFloating: true,
                timeZone: "America/Denver",
                priority: 3,
              },
            ],
          },
          {
            id: "today",
            title: "Today",
            tasks: [
              {
                title: "Call dentist",
                listName: "Inbox",
                isAllDay: false,
                isFloating: false,
                timeZone: "UTC",
                priority: 0,
              },
            ],
          },
        ],
      },
    });
    const serialized = JSON.stringify(result);
    for (const marker of Object.values(privateMarkers)) expect(serialized).not.toContain(marker);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen((result as { data: { sections: readonly unknown[] } }).data.sections)).toBe(true);
  });

  it("retains safe stale/partial signals without exposing raw warnings or failed project IDs", async () => {
    const privateWarning = "private backend warning for project-private";
    const result = await createGetTasksTool(
      dependencies({
        runtime: runtime({
          query: vi.fn(async () =>
            taskReadModel({
              freshness: "stale",
              isPartial: true,
              warning: privateWarning,
              failedProjectIds: ["private-failed-project"],
            })
          ),
        }),
      })
    )({ smartProjectId: "next7Days" });

    expect(result).toEqual({
      ok: true,
      data: {
        view: "next7Days",
        freshness: "stale",
        partial: true,
        warning: "TickTick data may be incomplete or out of date.",
        sections: [],
      },
    });
    expect(JSON.stringify(result)).not.toContain(privateWarning);
    expect(JSON.stringify(result)).not.toContain("private-failed-project");
  });

  it.each([undefined, null, "today", {}, { smartProjectId: undefined }, { smartProjectId: "all" }])(
    "rejects malformed input before loading a runtime (%j)",
    async (input) => {
      const loadRuntime = vi.fn(async () => runtime());
      const result = await createGetTasksTool(dependencies({ loadRuntime }))(
        input as { smartProjectId: "today" | "next7Days" }
      );

      expect(errorResult(result)).toMatchObject({
        code: "validation",
        message: "Review the task details and try again.",
        retry: "after-input-change",
      });
      expect(loadRuntime).not.toHaveBeenCalled();
    }
  );

  it("maps read failures to fixed safe output without leaking the backend message", async () => {
    const privateMarker = "private-network-detail";
    const result = await createGetTasksTool(
      dependencies({ runtime: runtime({ query: vi.fn().mockRejectedValue(new NetworkError(privateMarker)) }) })
    )({ smartProjectId: "today" });

    expect(errorResult(result)).toEqual({
      code: "network",
      message: "Couldn't reach TickTick. Available tasks may be out of date.",
      retry: "manual",
    });
    expect(JSON.stringify(result)).not.toContain(privateMarker);
  });

  it("does not mislabel an unexpected read ambiguity as task creation", async () => {
    const privateMarker = "private-read-ambiguity";
    const result = await createGetTasksTool(
      dependencies({
        runtime: runtime({ query: vi.fn().mockRejectedValue(new AmbiguousMutationError(privateMarker)) }),
      })
    )({ smartProjectId: "today" });

    expect(errorResult(result)).toEqual({
      code: "ambiguous-mutation",
      message: "TickTick may have applied this change. Refresh before trying again.",
      retry: "never",
    });
    expect(JSON.stringify(result)).not.toContain(privateMarker);
    expect(JSON.stringify(result)).not.toContain("created this task");
  });

  it("fails closed on a hostile runtime and malformed task without leaking either failure", async () => {
    const revokedRuntime = Proxy.revocable({}, {});
    revokedRuntime.revoke();
    const runtimeFailure = await createGetTasksTool(
      dependencies({ loadRuntime: vi.fn(async () => revokedRuntime.proxy as AiToolRuntime) })
    )({ smartProjectId: "today" });
    expect(errorResult(runtimeFailure)).toMatchObject({ code: "protocol", retry: "never" });

    const privateMarker = "private-hostile-task";
    const hostileTask = Object.defineProperty(task(), "title", {
      get() {
        throw new Error(privateMarker);
      },
    });
    const taskFailure = await createGetTasksTool(
      dependencies({
        runtime: runtime({
          query: vi.fn(async () =>
            taskReadModel({ sections: [{ id: "today", title: "Today", tasks: [hostileTask] }] })
          ),
        }),
      })
    )({ smartProjectId: "today" });

    expect(errorResult(taskFailure)).toMatchObject({ code: "protocol", retry: "never" });
    expect(JSON.stringify(taskFailure)).not.toContain(privateMarker);
  });

  it("requires only the runtime loader and never touches mutation preferences", async () => {
    const value = runtime();
    const loadRuntime = vi.fn(async () => value);
    const tasks = await createGetTasksTool({ loadRuntime })({ smartProjectId: "today" });
    expect(tasks).toMatchObject({ ok: true });

    let preferenceReads = 0;
    const hostileDependencies = Object.defineProperty({ loadRuntime }, "preferences", {
      get() {
        preferenceReads += 1;
        throw new Error("private mutation preference getter");
      },
    });
    const lists = await createGetListsTool(hostileDependencies)();

    expect(lists).toMatchObject({ ok: true });
    expect(preferenceReads).toBe(0);
  });
});

describe("createGetListsTool", () => {
  it("returns deeply frozen id/name/kind records and no other project fields", async () => {
    const listProjects = vi.fn(async () => [inboxProject, workProject]);
    const result = await createGetListsTool(dependencies({ runtime: runtime({ listProjects }) }))();

    expect(result).toEqual({
      ok: true,
      data: {
        lists: [
          { id: inboxProject.id, name: inboxProject.name, kind: inboxProject.kind },
          { id: workProject.id, name: workProject.name, kind: workProject.kind },
        ],
      },
    });
    expect(listProjects).toHaveBeenCalledOnce();
    expect(listProjects).toHaveBeenCalledWith(accountKey);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen((result as { data: { lists: readonly unknown[] } }).data.lists)).toBe(true);
    expect(Object.keys((result as { data: { lists: readonly Record<string, unknown>[] } }).data.lists[0])).toEqual([
      "id",
      "name",
      "kind",
    ]);
  });

  it("fails closed on malformed, duplicate, or non-authoritative catalogs", async () => {
    const catalogs: unknown[] = [
      undefined,
      [inboxProject, { ...workProject, id: inboxProject.id }],
      [workProject],
      [inboxProject, { ...workProject, closed: true }],
      [inboxProject, { ...workProject, name: "\u202eprivate" }],
    ];

    for (const catalog of catalogs) {
      const result = await createGetListsTool(
        dependencies({ runtime: runtime({ listProjects: vi.fn(async () => catalog) }) })
      )();
      expect(errorResult(result)).toMatchObject({ code: "protocol", retry: "never" });
      expect(JSON.stringify(result)).not.toContain("private");
    }
  });
});

describe("createAddTaskTool", () => {
  it("selects an explicit ID, normalizes input without transport escaping, and creates exactly once", async () => {
    const createTask = vi.fn(async (input: CreateTaskInput) =>
      task({ ...input, id: "confirmed-task", projectId: workProject.id, projectName: workProject.name })
    );
    const listProjects = vi.fn(async () => [inboxProject, workProject]);
    const value = runtime({ createTask, listProjects });
    const result = await createAddTaskTool(dependencies({ runtime: value }))({
      title: '  Say "hello"  ',
      projectId: workProject.id,
      content: "  private description  ",
      dueDate: "2026-08-15T09:30:00-06:00",
    });

    expect(result).toEqual({
      ok: true,
      data: { created: true, destination: { name: workProject.name, kind: workProject.kind } },
    });
    expect(listProjects).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledWith({
      title: 'Say "hello"',
      projectId: workProject.id,
      description: "private description",
      dueDate: "2026-08-15T15:30:00.000+0000",
      isAllDay: false,
    });
    expect(JSON.stringify(result)).not.toContain('Say "hello"');
    expect(JSON.stringify(result)).not.toContain("private description");
    expect(JSON.stringify(result)).not.toContain("confirmed-task");
  });

  it.each([
    [{ projectName: workProject.name }, workProject.id],
    [{ projectId: workProject.id, projectName: workProject.name }, workProject.id],
  ])("selects one unique exact project name or a consistent ID/name pair", async (selection, expectedId) => {
    const createTask = vi.fn(async (input: CreateTaskInput) =>
      task({ ...input, id: "confirmed", projectId: expectedId, projectName: workProject.name })
    );
    const result = await createAddTaskTool(dependencies({ runtime: runtime({ createTask }) }))({
      title: "Task",
      ...selection,
    });

    expect(result).toMatchObject({ ok: true });
    expect(createTask).toHaveBeenCalledWith({ title: "Task", projectId: expectedId });
    expect(createTask).toHaveBeenCalledOnce();
  });

  it.each([
    ["unknown ID", { projectId: "missing-project" }, [inboxProject, workProject]],
    ["unknown name", { projectName: "Missing" }, [inboxProject, workProject]],
    ["duplicate name", { projectName: workProject.name }, [inboxProject, workProject, duplicateWorkProject]],
    ["conflicting pair", { projectId: inboxProject.id, projectName: workProject.name }, [inboxProject, workProject]],
  ])("rejects an %s without falling back or creating", async (_case, selection, projects) => {
    const createTask = vi.fn<AiToolRuntime["createTask"]>();
    const result = await createAddTaskTool(
      dependencies({ runtime: runtime({ createTask, listProjects: vi.fn(async () => projects) }) })
    )({ title: "private title", ...selection });

    expect(errorResult(result)).toEqual({
      code: "validation",
      message: "Call get-lists, then retry with the intended list's projectId.",
      retry: "after-input-change",
    });
    expect(createTask).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("private title");
  });

  it("uses the scoped remembered project and otherwise only the real Inbox", async () => {
    const rememberedCreate = vi.fn(async (input: CreateTaskInput) =>
      task({ ...input, id: "remembered", projectId: workProject.id, projectName: workProject.name })
    );
    const remembered = await createAddTaskTool(
      dependencies({
        runtime: runtime({ createTask: rememberedCreate }),
        preferences: preferencePort(workProject.id),
      })
    )({ title: "Remembered" });
    expect(remembered).toMatchObject({ ok: true });
    expect(rememberedCreate).toHaveBeenCalledWith({ title: "Remembered", projectId: workProject.id });

    const inboxCreate = vi.fn(async (input: CreateTaskInput) =>
      task({ ...input, id: "inbox", projectId: inboxProject.id, projectName: inboxProject.name })
    );
    const inbox = await createAddTaskTool(
      dependencies({
        runtime: runtime({
          createTask: inboxCreate,
          listProjects: vi.fn(async () => [workProject, inboxProject]),
        }),
        preferences: preferencePort("stale-project"),
      })
    )({ title: "Inbox" });
    expect(inbox).toMatchObject({ ok: true });
    expect(inboxCreate).toHaveBeenCalledWith({ title: "Inbox", projectId: inboxProject.id });

    const namedInbox = { ...workProject, id: "named-inbox", name: "Inbox" };
    const noRealInboxCreate = vi.fn<AiToolRuntime["createTask"]>();
    const noRealInbox = await createAddTaskTool(
      dependencies({
        runtime: runtime({
          createTask: noRealInboxCreate,
          listProjects: vi.fn(async () => [workProject, namedInbox]),
        }),
        preferences: preferencePort("stale-project"),
      })
    )({ title: "No arbitrary fallback" });
    expect(errorResult(noRealInbox)).toMatchObject({ code: "protocol", retry: "never" });
    expect(noRealInboxCreate).not.toHaveBeenCalled();
  });

  it("guards unsupported create capability before catalog or mutation work", async () => {
    const listProjects = vi.fn<AiToolRuntime["taskService"]["listProjects"]>();
    const createTask = vi.fn<AiToolRuntime["createTask"]>();
    const result = await createAddTaskTool(
      dependencies({ runtime: runtime({ capabilities: { create: false }, listProjects, createTask }) })
    )({ title: "private title" });

    expect(errorResult(result)).toEqual({
      code: "protocol",
      message: "TickTick returned data this extension could not safely process.",
      retry: "never",
    });
    expect(listProjects).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("private title");
  });

  it.each([
    { title: "   ", projectId: workProject.id },
    { title: "Task", projectId: workProject.id, dueDate: "tomorrow" },
    { title: "Task", projectId: workProject.id, dueDate: "2026-08-15T09:30:00" },
    { title: "Task", projectId: 42 as unknown as string },
  ])("rejects invalid input before loading runtime or creating (case %#)", async (input) => {
    const loadRuntime = vi.fn(async () => runtime());
    const result = await createAddTaskTool(dependencies({ loadRuntime }))(input);

    expect(errorResult(result)).toMatchObject({ code: "validation", retry: "after-input-change" });
    expect(loadRuntime).not.toHaveBeenCalled();
  });

  it("waits for bound confirmation and never invokes create twice", async () => {
    const gate = deferred<unknown>();
    const createTask = vi.fn<AiToolRuntime["createTask"]>().mockReturnValue(gate.promise);
    let settled = false;
    const running = createAddTaskTool(dependencies({ runtime: runtime({ createTask }) }))({
      title: "private pending title",
      projectId: workProject.id,
    }).then((result) => {
      settled = true;
      return result;
    });

    await vi.waitFor(() => expect(createTask).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    gate.resolve(task({ id: "confirmed", projectId: workProject.id, projectName: workProject.name }));

    await expect(running).resolves.toMatchObject({ ok: true });
    expect(createTask).toHaveBeenCalledOnce();
  });

  it.each([
    ["typed ambiguity", new AmbiguousMutationError("private ambiguous backend detail"), "ambiguous-mutation"],
    ["ordinary network failure", new NetworkError("private network backend detail"), "network"],
    ["rate limit failure", new RateLimitError("private rate limit backend detail", 1_000), "rate-limit"],
  ] as const)("returns fixed safe terminal output for %s and never retries", async (_case, failure, expectedCode) => {
    const createTask = vi.fn().mockRejectedValue(failure);
    const result = await createAddTaskTool(dependencies({ runtime: runtime({ createTask }) }))({
      title: "private title",
      projectId: workProject.id,
      content: "private body",
    });

    expect(createTask).toHaveBeenCalledOnce();
    const error = errorResult(result);
    if (failure instanceof AmbiguousMutationError) {
      expect(error).toEqual({
        code: "ambiguous-mutation",
        message: "TickTick may have created this task. Check TickTick before trying again.",
        retry: "never",
      });
    } else {
      expect(error).toEqual({
        code: expectedCode,
        message: "Couldn't confirm task creation. Check TickTick before trying again.",
        retry: "never",
      });
    }
    const serialized = JSON.stringify(result);
    for (const marker of ["private title", "private body", failure.message]) expect(serialized).not.toContain(marker);
  });

  it.each([
    ["blank ID", task({ id: " ", projectId: workProject.id })],
    ["mismatched project", task({ id: "confirmed", projectId: inboxProject.id })],
  ])("treats a %s confirmation as fixed ambiguity without retry", async (_case, confirmation) => {
    const createTask = vi.fn(async () => confirmation);
    const result = await createAddTaskTool(dependencies({ runtime: runtime({ createTask }) }))({
      title: "private title",
      projectId: workProject.id,
    });

    expect(createTask).toHaveBeenCalledOnce();
    expect(errorResult(result)).toEqual({
      code: "ambiguous-mutation",
      message: "TickTick may have created this task. Check TickTick before trying again.",
      retry: "never",
    });
  });

  it("snapshots hostile input and confirmation fields once without reading private task content", async () => {
    const inputReads = { title: 0, projectId: 0, projectName: 0, dueDate: 0, content: 0 };
    const input = Object.defineProperties(
      {},
      {
        title: { get: () => ((inputReads.title += 1), "Task") },
        projectId: { get: () => ((inputReads.projectId += 1), workProject.id) },
        projectName: { get: () => ((inputReads.projectName += 1), undefined) },
        dueDate: { get: () => ((inputReads.dueDate += 1), undefined) },
        content: { get: () => ((inputReads.content += 1), undefined) },
      }
    ) as { title: string };
    const confirmationReads = { id: 0, projectId: 0 };
    const confirmed = Object.defineProperties(
      {},
      {
        id: { get: () => ((confirmationReads.id += 1), "confirmed") },
        projectId: { get: () => ((confirmationReads.projectId += 1), workProject.id) },
        title: {
          get() {
            throw new Error("private confirmed title must not be read");
          },
        },
        content: {
          get() {
            throw new Error("private confirmed content must not be read");
          },
        },
      }
    );
    const createTask = vi.fn(async () => confirmed);
    const result = await createAddTaskTool(dependencies({ runtime: runtime({ createTask }) }))(input);

    expect(result).toMatchObject({ ok: true });
    expect(inputReads).toEqual({ title: 1, projectId: 1, projectName: 1, dueDate: 1, content: 1 });
    expect(confirmationReads).toEqual({ id: 1, projectId: 1 });
  });

  it("fails closed on a hostile confirmation and hostile error without leaking either", async () => {
    const privateConfirmation = "private confirmation getter";
    const hostileConfirmation = Object.defineProperty({}, "id", {
      get() {
        throw new Error(privateConfirmation);
      },
    });
    const confirmationResult = await createAddTaskTool(
      dependencies({ runtime: runtime({ createTask: vi.fn(async () => hostileConfirmation) }) })
    )({ title: "private title", projectId: workProject.id });
    expect(errorResult(confirmationResult)).toMatchObject({ code: "ambiguous-mutation", retry: "never" });
    expect(JSON.stringify(confirmationResult)).not.toContain(privateConfirmation);

    const revokedError = Proxy.revocable({}, {});
    revokedError.revoke();
    const hostileErrorResult = await createAddTaskTool(
      dependencies({ runtime: runtime({ createTask: vi.fn().mockRejectedValue(revokedError.proxy) }) })
    )({ title: "private title", projectId: workProject.id });
    expect(errorResult(hostileErrorResult)).toMatchObject({ code: "unknown", retry: "never" });
  });
});

describe("tool controller boundaries", () => {
  it("contains no concrete backend, factory, legacy, Raycast storage, raw logging, or retry timer import", () => {
    const source = readFileSync(resolve(__dirname, "toolController.ts"), "utf8");

    expect(source).not.toMatch(
      /service\/osScript|service\/project|run-applescript|BackendFactory|McpTickTickBackend|OpenApiTickTickBackend|MacOsAppleScriptBackend|@raycast\/api|LocalStorage|console\.|setTimeout|setInterval/
    );
  });
});
