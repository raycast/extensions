import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { createReadyCommandRuntime, type ReadyCommandRuntime } from "../application/commandRuntime";
import type { CreateFormDefaults } from "../application/createDefaults";
import type { TaskDestinationPreferencePort, TaskDestinationScope } from "../application/taskDestination";
import { ProtocolError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { CreateTaskInput, Task } from "../domain/task";
import type { TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { TaskRepository } from "../infrastructure/cache/TaskRepository";
import { InMemoryCachePort } from "../test/fakes/InMemoryCachePort";
import { prepareCreateTaskCommandRuntime, type CreateTaskCommandRuntimeDependencies } from "./createTaskCommandRuntime";

const DENVER = "America/Denver";

const inboxProject: Project = Object.freeze({
  id: "project-inbox",
  name: "Inbox",
  kind: "inbox",
  closed: false,
});

const workProject: Project = Object.freeze({
  id: "project-work",
  name: "Work",
  kind: "project",
  closed: false,
});

const confirmedTask: Task = Object.freeze({
  id: "task-confirmed",
  projectId: workProject.id,
  title: "Synthetic confirmed task",
  projectName: workProject.name,
  status: "open",
  priority: 0,
  tags: Object.freeze([]) as unknown as string[],
  kind: "TEXT",
  isAllDay: false,
  isFloating: true,
  timeZone: DENVER,
});

function backend(overrides: Partial<TickTickBackend> = {}, createSupported = true): TickTickBackend {
  return {
    id: "mcp",
    capabilities: () => ({
      create: createSupported,
      update: true,
      complete: true,
      reopen: true,
      move: true,
      completedQuery: true,
      inboxQuery: true,
      exactTaskLink: true,
    }),
    accountIdentity: async () => undefined,
    listProjects: async () => [inboxProject, workProject],
    queryTasks: async () => ({ tasks: [], failedProjectIds: [] }),
    createTask: async () => confirmedTask,
    updateTask: async () => {
      throw new Error("unused");
    },
    completeTask: async () => undefined,
    reopenTask: async () => undefined,
    moveTask: async () => {
      throw new Error("unused");
    },
    ...overrides,
  };
}

function runtime(
  source: TickTickBackend = backend(),
  accountKey = "oauth:account-a",
  recovery: Readonly<{ onReconnect?: () => void; onOpenPreferences?: () => void }> = {}
): ReadyCommandRuntime {
  return createReadyCommandRuntime({
    backend: source,
    accountKey,
    repository: new TaskRepository(new InMemoryCachePort()),
    ...recovery,
  });
}

function preferencePort(...values: [rememberedProjectId?: string | undefined]): TaskDestinationPreferencePort {
  const rememberedProjectId = values.length === 0 ? workProject.id : values[0];
  return {
    load: vi.fn(async () => rememberedProjectId),
    remember: vi.fn(async () => undefined),
  };
}

function dependencies(
  overrides: Partial<CreateTaskCommandRuntimeDependencies> = {}
): CreateTaskCommandRuntimeDependencies {
  return {
    preferences: preferencePort(),
    loadDefaults: vi.fn(async () => ({
      defaultTitle: "Default title",
      defaultDate: Object.freeze(new Date("2026-08-15T15:00:00.000Z")),
      uiTimeZone: DENVER,
    })),
    fieldAvailability: {
      project: true,
      description: true,
      startDate: false,
      dueDate: true,
      isAllDay: true,
      priority: false,
      tags: false,
    },
    ...overrides,
  };
}

async function captureFailure(operation: () => Promise<unknown>): Promise<unknown> {
  try {
    await operation();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the operation to fail.");
}

describe("prepareCreateTaskCommandRuntime", () => {
  it("exposes the command preparation contract", () => {
    expectTypeOf(prepareCreateTaskCommandRuntime).toBeFunction();
    expectTypeOf(prepareCreateTaskCommandRuntime).parameter(0).toEqualTypeOf<ReadyCommandRuntime>();
    expectTypeOf(prepareCreateTaskCommandRuntime).parameter(1).toEqualTypeOf<CreateTaskCommandRuntimeDependencies>();
    expectTypeOf(prepareCreateTaskCommandRuntime).parameter(2).toEqualTypeOf<AbortSignal | undefined>();
  });

  it("loads the authoritative catalog and scoped preference before private defaults, then returns a frozen exact view runtime", async () => {
    const events: string[] = [];
    const source = runtime();
    const signal = new AbortController().signal;
    const listProjects = vi
      .spyOn(source.taskService, "listProjects")
      .mockImplementation(async (accountKey, force, receivedSignal) => {
        events.push("projects");
        expect(accountKey).toBe("oauth:account-a");
        expect(force).toBe(false);
        expect(receivedSignal).toBe(signal);
        return [workProject, inboxProject];
      });
    const preferences: TaskDestinationPreferencePort = {
      load: vi.fn(async (scope) => {
        events.push("preference");
        expect(scope).toEqual({ backendId: "mcp", accountKey: "oauth:account-a" });
        return workProject.id;
      }),
      remember: vi.fn(async () => undefined),
    };
    const defaultDate = new Date("2026-08-15T15:00:00.000Z");
    const loadDefaults = vi.fn(async () => {
      events.push("defaults");
      return { defaultTitle: "Default title", defaultDate, uiTimeZone: DENVER } satisfies CreateFormDefaults;
    });
    const fieldAvailability = { project: true, description: false, dueDate: true };

    const prepared = await prepareCreateTaskCommandRuntime(
      source,
      dependencies({ preferences, loadDefaults, fieldAvailability }),
      signal
    );

    expect(events).toEqual(["projects", "preference", "defaults"]);
    expect(listProjects).toHaveBeenCalledOnce();
    expect(prepared).toMatchObject({
      kind: "ready",
      contextKey: source.contextKey,
      projects: [workProject, inboxProject],
      rememberedProjectId: workProject.id,
      defaultTitle: "Default title",
      defaultDate,
      uiTimeZone: DENVER,
      fieldAvailability,
    });
    expect(prepared.defaultDate).not.toBe(defaultDate);
    expect(prepared.fieldAvailability).not.toBe(fieldAvailability);
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(Object.isFrozen(prepared.projects)).toBe(true);
    expect(prepared.projects.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(prepared.defaultDate)).toBe(true);
    expect(Object.isFrozen(prepared.fieldAvailability)).toBe(true);
    expect(Object.keys(prepared).sort()).toEqual([
      "contextKey",
      "createTask",
      "defaultDate",
      "defaultTitle",
      "fieldAvailability",
      "kind",
      "projects",
      "rememberProjectId",
      "rememberedProjectId",
      "uiTimeZone",
    ]);
    expect(prepared).not.toHaveProperty("accountKey");
    expect(prepared).not.toHaveProperty("backendId");
    expect(prepared).not.toHaveProperty("taskService");
    expect(prepared).not.toHaveProperty("capabilities");
  });

  it("binds confirmed creation through projectTaskCreationRuntime without creating during preparation", async () => {
    const createTask = vi.fn(async () => confirmedTask);
    const source = runtime(backend({ createTask }));
    vi.spyOn(source.taskService, "listProjects").mockResolvedValue([inboxProject, workProject]);
    const input: CreateTaskInput = { title: "Exact input", projectId: workProject.id };

    const prepared = await prepareCreateTaskCommandRuntime(source, dependencies());

    expect(createTask).not.toHaveBeenCalled();
    await expect(prepared.createTask(input)).resolves.toBe(confirmedTask);
    expect(createTask).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledWith(input);
  });

  it("scope-binds remembered destination writes without exposing private identity", async () => {
    const source = runtime();
    vi.spyOn(source.taskService, "listProjects").mockResolvedValue([inboxProject, workProject]);
    const preferences = preferencePort(workProject.id);
    const prepared = await prepareCreateTaskCommandRuntime(source, dependencies({ preferences }));

    await prepared.rememberProjectId?.(inboxProject.id);

    expect(preferences.remember).toHaveBeenCalledOnce();
    expect(preferences.remember).toHaveBeenCalledWith(
      { backendId: "mcp", accountKey: "oauth:account-a" } satisfies TaskDestinationScope,
      inboxProject.id
    );
    expect(JSON.stringify(prepared)).not.toContain("oauth:account-a");
  });

  it("snapshots the preference port and both receiver-bound methods once after catalog success", async () => {
    const source = runtime();
    vi.spyOn(source.taskService, "listProjects").mockResolvedValue([inboxProject, workProject]);
    const originalLoad = vi.fn(function (this: object, scope: TaskDestinationScope) {
      expect(this).toBe(originalPort);
      expect(Object.isFrozen(scope)).toBe(true);
      return Promise.resolve(workProject.id);
    });
    const originalRemember = vi.fn(function (this: object, scope: TaskDestinationScope, projectId: string) {
      expect(this).toBe(originalPort);
      expect(Object.isFrozen(scope)).toBe(true);
      expect(projectId).toBe(inboxProject.id);
      return Promise.resolve();
    });
    const reads = { port: 0, load: 0, remember: 0 };
    const originalPort = Object.defineProperties(
      {},
      {
        load: {
          get() {
            reads.load += 1;
            return originalLoad;
          },
        },
        remember: {
          get() {
            reads.remember += 1;
            return originalRemember;
          },
        },
      }
    ) as TaskDestinationPreferencePort;
    const replacementPort: TaskDestinationPreferencePort = {
      load: vi.fn(async () => inboxProject.id),
      remember: vi.fn(async () => undefined),
    };
    let currentPort = originalPort;
    const deps = Object.defineProperty(dependencies(), "preferences", {
      configurable: true,
      get() {
        reads.port += 1;
        return currentPort;
      },
    });

    const prepared = await prepareCreateTaskCommandRuntime(source, deps);
    currentPort = replacementPort;
    await prepared.rememberProjectId?.(inboxProject.id);

    expect(reads).toEqual({ port: 1, load: 1, remember: 1 });
    expect(originalLoad).toHaveBeenCalledOnce();
    expect(originalRemember).toHaveBeenCalledOnce();
    expect(replacementPort.load).not.toHaveBeenCalled();
    expect(replacementPort.remember).not.toHaveBeenCalled();
  });

  it.each([
    ["remembered project", workProject.id, [workProject, inboxProject], workProject.id],
    ["unknown preference", "missing", [workProject, inboxProject], inboxProject.id],
    ["no preference", undefined, [workProject, inboxProject], inboxProject.id],
    ["no preference or Inbox", undefined, [workProject], undefined],
  ] as const)(
    "maps %s to only a real preferred-or-Inbox form default",
    async (_case, remembered, catalog, expected) => {
      const source = runtime();
      vi.spyOn(source.taskService, "listProjects").mockResolvedValue([...catalog]);

      const prepared = await prepareCreateTaskCommandRuntime(
        source,
        dependencies({ preferences: preferencePort(remembered) })
      );

      expect(prepared.rememberedProjectId).toBe(expected);
      if (expected === undefined) expect(prepared).not.toHaveProperty("rememberedProjectId");
    }
  );

  it("guards unsupported creation before catalog, preferences, private defaults, or field availability", async () => {
    const source = runtime(backend({}, false));
    const listProjects = vi.spyOn(source.taskService, "listProjects");
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

    const failure = await captureFailure(() => prepareCreateTaskCommandRuntime(source, hostile));

    expect(failure).toEqual(new ProtocolError("This TickTick backend cannot create tasks."));
    expect(listProjects).not.toHaveBeenCalled();
    expect(reads).toEqual({ preferences: 0, defaults: 0, fields: 0 });
  });

  it("preserves a raw catalog failure and never reads preferences or defaults", async () => {
    const marker = Object.freeze({ private: "catalog failure" });
    const source = runtime();
    vi.spyOn(source.taskService, "listProjects").mockRejectedValue(marker);
    const preferences = preferencePort();
    const loadDefaults = vi.fn(async () => ({ uiTimeZone: DENVER }));

    await expect(prepareCreateTaskCommandRuntime(source, dependencies({ preferences, loadDefaults }))).rejects.toBe(
      marker
    );
    expect(preferences.load).not.toHaveBeenCalled();
    expect(loadDefaults).not.toHaveBeenCalled();
  });

  it("does not touch the preference boundary before the authoritative catalog gate succeeds", async () => {
    const marker = Object.freeze({ private: "catalog failure" });
    const source = runtime();
    vi.spyOn(source.taskService, "listProjects").mockRejectedValue(marker);
    let preferenceReads = 0;
    const deps = Object.defineProperty(dependencies(), "preferences", {
      configurable: true,
      get() {
        preferenceReads += 1;
        throw new Error("PRIVATE preference boundary");
      },
    });

    await expect(prepareCreateTaskCommandRuntime(source, deps)).rejects.toBe(marker);
    expect(preferenceReads).toBe(0);
    expect(deps.loadDefaults).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed", () => Promise.resolve({ private: "malformed catalog" } as unknown as Project[])],
    [
      "revoked",
      () => {
        const catalog = Proxy.revocable([inboxProject], {});
        const resolved = Promise.resolve(catalog.proxy as Project[]);
        catalog.revoke();
        return resolved;
      },
    ],
  ])("does not touch private preferences when a resolved %s catalog fails normalization", async (_case, catalog) => {
    const source = runtime();
    vi.spyOn(source.taskService, "listProjects").mockReturnValue(catalog());
    const loadDefaults = vi.fn(async () => ({ uiTimeZone: DENVER }));
    let preferenceReads = 0;
    const deps = Object.defineProperty(dependencies({ loadDefaults }), "preferences", {
      configurable: true,
      get() {
        preferenceReads += 1;
        throw new Error("PRIVATE preference boundary");
      },
    });

    const failure = await captureFailure(() => prepareCreateTaskCommandRuntime(source, deps));

    expect(failure).toEqual(new ProtocolError("TickTick did not expose an available task destination."));
    expect((failure as Error & { cause?: unknown }).cause).toBeUndefined();
    expect(String(failure)).not.toContain("PRIVATE");
    expect(preferenceReads).toBe(0);
    expect(loadDefaults).not.toHaveBeenCalled();
  });

  it.each([
    ["missing load", { remember: vi.fn(async () => undefined) }],
    ["missing remember", { load: vi.fn(async () => workProject.id) }],
    [
      "hostile remember accessor",
      Object.defineProperties(
        {},
        {
          load: { value: vi.fn(async () => workProject.id) },
          remember: {
            get() {
              throw new Error("PRIVATE remember accessor");
            },
          },
        }
      ),
    ],
  ])("surfaces a %s structural preference boundary failure before defaults", async (_case, preferences) => {
    const source = runtime();
    vi.spyOn(source.taskService, "listProjects").mockResolvedValue([inboxProject, workProject]);
    const loadDefaults = vi.fn(async () => ({ uiTimeZone: DENVER }));

    const failure = await captureFailure(() =>
      prepareCreateTaskCommandRuntime(
        source,
        dependencies({ preferences: preferences as TaskDestinationPreferencePort, loadDefaults })
      )
    );

    expect(failure).toEqual(new ProtocolError("TickTick create command runtime dependencies are invalid."));
    expect((failure as Error & { cause?: unknown }).cause).toBeUndefined();
    expect(String(failure)).not.toContain("PRIVATE");
    expect(loadDefaults).not.toHaveBeenCalled();
  });

  it("preserves a raw defaults failure only after destination context is complete", async () => {
    const marker = Object.freeze({ private: "defaults failure" });
    const source = runtime();
    vi.spyOn(source.taskService, "listProjects").mockResolvedValue([inboxProject]);
    const preferences = preferencePort(undefined);
    const loadDefaults = vi.fn(() => Promise.reject(marker));

    await expect(prepareCreateTaskCommandRuntime(source, dependencies({ preferences, loadDefaults }))).rejects.toBe(
      marker
    );
    expect(preferences.load).toHaveBeenCalledOnce();
    expect(loadDefaults).toHaveBeenCalledOnce();
  });

  it("fails closed for malformed defaults and field availability without leaking hostile values", async () => {
    const source = runtime();
    vi.spyOn(source.taskService, "listProjects").mockResolvedValue([inboxProject]);
    const defaultsFailure = await captureFailure(() =>
      prepareCreateTaskCommandRuntime(
        source,
        dependencies({ loadDefaults: vi.fn(async () => ({ uiTimeZone: "PRIVATE/not-a-zone" })) })
      )
    );
    const fieldsFailure = await captureFailure(() =>
      prepareCreateTaskCommandRuntime(
        source,
        dependencies({ fieldAvailability: { project: "PRIVATE" } as unknown as { project: boolean } })
      )
    );

    for (const failure of [defaultsFailure, fieldsFailure]) {
      expect(failure).toEqual(new ProtocolError("TickTick create command runtime dependencies are invalid."));
      expect((failure as Error & { cause?: unknown }).cause).toBeUndefined();
      expect(String(failure)).not.toContain("PRIVATE");
    }
  });

  it("maps hostile defaults and a revoked field-availability proxy to the same fixed cause-free boundary error", async () => {
    const source = runtime();
    vi.spyOn(source.taskService, "listProjects").mockResolvedValue([inboxProject]);
    const hostileDefaults = new Proxy(
      {},
      {
        get(_target, property) {
          if (property === "then") return undefined;
          throw new Error("PRIVATE defaults accessor");
        },
      }
    );
    const revokedFields = Proxy.revocable({}, {});
    revokedFields.revoke();

    const defaultsFailure = await captureFailure(() =>
      prepareCreateTaskCommandRuntime(
        source,
        dependencies({
          loadDefaults: vi.fn(async () => hostileDefaults as unknown as CreateFormDefaults),
        })
      )
    );
    const fieldsFailure = await captureFailure(() =>
      prepareCreateTaskCommandRuntime(source, dependencies({ fieldAvailability: revokedFields.proxy }))
    );

    for (const failure of [defaultsFailure, fieldsFailure]) {
      expect(failure).toEqual(new ProtocolError("TickTick create command runtime dependencies are invalid."));
      expect((failure as Error & { cause?: unknown }).cause).toBeUndefined();
    }
  });

  it("honors an aborted preparation before private defaults can run", async () => {
    const controller = new AbortController();
    const source = runtime();
    const preferences = preferencePort();
    const loadDefaults = vi.fn(async () => ({ uiTimeZone: DENVER }));
    vi.spyOn(source.taskService, "listProjects").mockImplementation(async (_accountKey, _force, signal) => {
      expect(signal).toBe(controller.signal);
      controller.abort(new Error("synthetic abort"));
      return [inboxProject];
    });

    await expect(
      prepareCreateTaskCommandRuntime(source, dependencies({ preferences, loadDefaults }), controller.signal)
    ).rejects.toBe(controller.signal.reason);
    expect(preferences.load).not.toHaveBeenCalled();
    expect(loadDefaults).not.toHaveBeenCalled();
  });

  it("has no concrete backend, factory, Raycast, legacy, network, timer, or scheduler dependency", () => {
    const source = readFileSync(resolve(__dirname, "createTaskCommandRuntime.ts"), "utf8");

    expect(source).not.toMatch(
      /McpTickTickBackend|OpenApiTickTickBackend|MacOsAppleScriptBackend|BackendFactory|@raycast\/api|LocalStorage|run-applescript|\bfetch\b|XMLHttpRequest|WebSocket|console\.|setTimeout|setInterval|queueMicrotask|Task8/i
    );
    expect(source).not.toMatch(/infrastructure\/(?:mcp|openapi|macos)|\.\.\/service|\.\.\/platform/);
  });
});
