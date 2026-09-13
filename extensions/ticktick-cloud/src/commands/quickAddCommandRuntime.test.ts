import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { QuickAddDefaults } from "../application/createDefaults";
import { createReadyCommandRuntime, type ReadyCommandRuntime } from "../application/commandRuntime";
import type { TaskDestinationPreferencePort, TaskDestinationScope } from "../application/taskDestination";
import { AmbiguousMutationError, NetworkError, ProtocolError, ValidationError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { CreateTaskInput, Task } from "../domain/task";
import type { BackendCapabilities, TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import { TaskRepository } from "../infrastructure/cache/TaskRepository";
import { InMemoryCachePort } from "../test/fakes/InMemoryCachePort";
import type { QuickAddCommandEffects, QuickAddCommandInput, QuickAddCommandToast } from "./executeQuickAddCommand";
import { executeQuickAddFromRuntime, type QuickAddCommandRuntimePorts } from "./quickAddCommandRuntime";

const accountKey = "oauth:PRIVATE-quick-add-account";
const capabilities: BackendCapabilities = {
  create: true,
  update: true,
  complete: true,
  reopen: true,
  move: true,
  completedQuery: true,
  inboxQuery: true,
  exactTaskLink: true,
};
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

function taskFixture(input: CreateTaskInput, overrides: Partial<Task> = {}): Task {
  const projectId = input.projectId ?? inboxProject.id;
  return {
    id: "task-confirmed",
    projectId,
    projectName: projectId === workProject.id ? workProject.name : inboxProject.name,
    title: input.title,
    status: "open",
    priority: 0,
    tags: [],
    kind: "TEXT",
    isAllDay: false,
    isFloating: true,
    timeZone: "America/Denver",
    ...overrides,
  };
}

type RuntimeFixture = Readonly<{
  runtime: ReadyCommandRuntime;
  backend: TickTickBackend;
  listProjects: ReturnType<typeof vi.fn<TickTickBackend["listProjects"]>>;
  queryTasks: ReturnType<typeof vi.fn<TickTickBackend["queryTasks"]>>;
  createTask: ReturnType<typeof vi.fn<TickTickBackend["createTask"]>>;
}>;

function runtimeFixture(
  overrides: Partial<{
    capabilities: BackendCapabilities;
    projects: Project[];
    listProjects: TickTickBackend["listProjects"];
    queryTasks: TickTickBackend["queryTasks"];
    createTask: TickTickBackend["createTask"];
  }> = {}
): RuntimeFixture {
  const projects = overrides.projects ?? [inboxProject, workProject];
  const listProjects = vi.fn(overrides.listProjects ?? (async () => projects));
  const queryTasks = vi.fn(overrides.queryTasks ?? (async () => ({ tasks: [], failedProjectIds: [] })));
  const createTask = vi.fn(overrides.createTask ?? (async (input) => taskFixture(input)));
  const backend: TickTickBackend = {
    id: "mcp",
    capabilities: vi.fn(() => ({ ...(overrides.capabilities ?? capabilities) })),
    accountIdentity: async () => undefined,
    listProjects,
    queryTasks,
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
  return {
    runtime: createReadyCommandRuntime({
      backend,
      accountKey,
      repository: new TaskRepository(new InMemoryCachePort()),
    }),
    backend,
    listProjects,
    queryTasks,
    createTask,
  };
}

function effects(overrides: Partial<QuickAddCommandEffects> = {}): QuickAddCommandEffects {
  return {
    showToast: vi.fn(async () => undefined),
    closeMainWindow: vi.fn(async () => undefined),
    ...overrides,
  };
}

function ports(
  overrides: Partial<{
    preferredProjectId: string | undefined;
    preferences: TaskDestinationPreferencePort;
    loadDefaults(): Promise<QuickAddDefaults>;
    effects: QuickAddCommandEffects;
  }> = {}
): QuickAddCommandRuntimePorts {
  return {
    preferences:
      overrides.preferences ??
      ({
        load: vi.fn(async () => overrides.preferredProjectId),
        remember: vi.fn(async () => undefined),
      } satisfies TaskDestinationPreferencePort),
    loadDefaults: overrides.loadDefaults ?? vi.fn(async () => Object.freeze({})),
    effects: overrides.effects ?? effects(),
  };
}

function toastCalls(commandEffects: QuickAddCommandEffects): QuickAddCommandToast[] {
  return vi.mocked(commandEffects.showToast).mock.calls.map(([toast]) => toast);
}

describe("executeQuickAddFromRuntime", () => {
  it("uses the remembered open destination and performs catalog, defaults, one confirmed create, and effects in order", async () => {
    const events: string[] = [];
    const fixture = runtimeFixture({
      listProjects: async () => {
        events.push("catalog");
        return [inboxProject, workProject];
      },
      queryTasks: async () => {
        events.push("snapshot");
        return { tasks: [], failedProjectIds: [] };
      },
      createTask: async (input) => {
        events.push("create");
        return taskFixture(input);
      },
    });
    const preferences: TaskDestinationPreferencePort = {
      load: vi.fn(async (scope) => {
        events.push("preference");
        expect(scope).toEqual({ backendId: "mcp", accountKey });
        expect(Object.isFrozen(scope)).toBe(true);
        return workProject.id;
      }),
      remember: vi.fn(async () => undefined),
    };
    const commandEffects = effects({
      showToast: vi.fn(async (toast) => {
        events.push(`toast:${toast.title}`);
      }),
      closeMainWindow: vi.fn(async () => {
        events.push("close");
      }),
    });
    const loadDefaults = vi.fn(async () => {
      events.push("defaults");
      return Object.freeze({});
    });

    await executeQuickAddFromRuntime(
      fixture.runtime,
      { preferences, loadDefaults, effects: commandEffects },
      { text: "  PRIVATE task  ", description: "  PRIVATE description  " }
    );

    expect(events).toEqual([
      "toast:Adding Task",
      "catalog",
      "snapshot",
      "preference",
      "defaults",
      "create",
      "toast:Task Added",
      "close",
    ]);
    expect(fixture.createTask).toHaveBeenCalledOnce();
    expect(fixture.createTask).toHaveBeenCalledWith({
      title: "PRIVATE task",
      description: "PRIVATE description",
      projectId: workProject.id,
    });
    expect(loadDefaults).toHaveBeenCalledOnce();
    expect(preferences.remember).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(commandEffects.showToast).mock.calls)).not.toMatch(
      /PRIVATE task|PRIVATE description|PRIVATE-quick-add-account|project-work/
    );
  });

  it("falls back from a stale preference only to the real Inbox and never rewrites the preference", async () => {
    const fixture = runtimeFixture({ projects: [workProject, inboxProject] });
    const commandPorts = ports({ preferredProjectId: "stale-private-project" });

    await executeQuickAddFromRuntime(fixture.runtime, commandPorts, { text: "Inbox fallback" });

    expect(fixture.createTask).toHaveBeenCalledWith({ title: "Inbox fallback", projectId: inboxProject.id });
    expect(commandPorts.preferences.remember).not.toHaveBeenCalled();
  });

  it("shows progress before an unsupported-create failure and leaves catalog, preferences, defaults, and create untouched", async () => {
    const fixture = runtimeFixture({ capabilities: { ...capabilities, create: false } });
    const commandPorts = ports();

    await executeQuickAddFromRuntime(fixture.runtime, commandPorts, { text: "Unsupported" });

    expect(toastCalls(commandPorts.effects)).toEqual([
      { style: "animated", title: "Adding Task" },
      {
        style: "failure",
        title: "Task Could Not Be Added",
        message: "TickTick returned data this extension could not safely process.",
      },
    ]);
    expect(fixture.listProjects).not.toHaveBeenCalled();
    expect(fixture.queryTasks).not.toHaveBeenCalled();
    expect(commandPorts.preferences.load).not.toHaveBeenCalled();
    expect(commandPorts.loadDefaults).not.toHaveBeenCalled();
    expect(fixture.createTask).not.toHaveBeenCalled();
    expect(commandPorts.effects.closeMainWindow).not.toHaveBeenCalled();
  });

  it("never reads preference or defaults accessors when create is unsupported", async () => {
    const fixture = runtimeFixture({ capabilities: { ...capabilities, create: false } });
    const commandEffects = effects();
    const reads = { preferences: 0, loadDefaults: 0, effects: 0 };
    const commandPorts = Object.defineProperties(
      {},
      {
        preferences: {
          get() {
            reads.preferences += 1;
            throw new Error("PRIVATE preferences must stay unread");
          },
        },
        loadDefaults: {
          get() {
            reads.loadDefaults += 1;
            throw new Error("PRIVATE defaults must stay unread");
          },
        },
        effects: {
          get() {
            reads.effects += 1;
            return commandEffects;
          },
        },
      }
    ) as QuickAddCommandRuntimePorts;

    await expect(
      executeQuickAddFromRuntime(fixture.runtime, commandPorts, { text: "Unsupported" })
    ).resolves.toBeUndefined();

    expect(reads).toEqual({ preferences: 0, loadDefaults: 0, effects: 1 });
    expect(toastCalls(commandEffects).map((toast) => toast.title)).toEqual(["Adding Task", "Task Could Not Be Added"]);
    expect(fixture.listProjects).not.toHaveBeenCalled();
    expect(fixture.createTask).not.toHaveBeenCalled();
  });

  it("never reads the success-only close effect accessor when create is unsupported", async () => {
    const fixture = runtimeFixture({ capabilities: { ...capabilities, create: false } });
    const showToast = vi.fn<(toast: QuickAddCommandToast) => Promise<void>>(async () => undefined);
    let closeReads = 0;
    const commandEffects = Object.defineProperties(
      { showToast },
      {
        closeMainWindow: {
          get() {
            closeReads += 1;
            throw new Error("PRIVATE close effect must stay unread");
          },
        },
      }
    ) as unknown as QuickAddCommandEffects;

    await expect(
      executeQuickAddFromRuntime(fixture.runtime, ports({ effects: commandEffects }), { text: "Unsupported" })
    ).resolves.toBeUndefined();

    expect(closeReads).toBe(0);
    expect(vi.mocked(showToast).mock.calls.map(([toast]) => toast.title)).toEqual([
      "Adding Task",
      "Task Could Not Be Added",
    ]);
    expect(fixture.listProjects).not.toHaveBeenCalled();
    expect(fixture.createTask).not.toHaveBeenCalled();
  });

  it("never reads preference or defaults accessors when catalog loading fails", async () => {
    const fixture = runtimeFixture({
      listProjects: async () => Promise.reject(new ProtocolError("PRIVATE catalog failure")),
    });
    const commandEffects = effects();
    const reads = { preferences: 0, loadDefaults: 0 };
    const commandPorts = Object.defineProperties(
      { effects: commandEffects },
      {
        preferences: {
          get() {
            reads.preferences += 1;
            throw new Error("PRIVATE preferences must stay unread");
          },
        },
        loadDefaults: {
          get() {
            reads.loadDefaults += 1;
            throw new Error("PRIVATE defaults must stay unread");
          },
        },
      }
    ) as QuickAddCommandRuntimePorts;

    await expect(
      executeQuickAddFromRuntime(fixture.runtime, commandPorts, { text: "Catalog failure" })
    ).resolves.toBeUndefined();

    expect(reads).toEqual({ preferences: 0, loadDefaults: 0 });
    expect(fixture.listProjects).toHaveBeenCalledOnce();
    expect(fixture.createTask).not.toHaveBeenCalled();
    expect(toastCalls(commandEffects).map((toast) => toast.title)).toEqual(["Adding Task", "Task Could Not Be Added"]);
  });

  it("fails safely without loading defaults or creating when neither remembered destination nor real Inbox exists", async () => {
    const fixture = runtimeFixture({ projects: [workProject] });
    const commandPorts = ports({ preferredProjectId: "stale-project" });

    await executeQuickAddFromRuntime(fixture.runtime, commandPorts, { text: "No destination" });

    expect(fixture.listProjects).toHaveBeenCalledOnce();
    expect(commandPorts.preferences.load).not.toHaveBeenCalled();
    expect(commandPorts.loadDefaults).not.toHaveBeenCalled();
    expect(fixture.createTask).not.toHaveBeenCalled();
    expect(commandPorts.effects.closeMainWindow).not.toHaveBeenCalled();
    expect(toastCalls(commandPorts.effects).at(-1)).toEqual({
      style: "failure",
      title: "Task Could Not Be Added",
      message: "TickTick returned data this extension could not safely process.",
    });
  });

  it("applies no date fields when defaults are absent and never consults title or clipboard-shaped extras", async () => {
    let defaultTitleReads = 0;
    let clipboardReads = 0;
    const defaults = Object.defineProperties(
      {},
      {
        defaultTitle: {
          get() {
            defaultTitleReads += 1;
            throw new Error("PRIVATE default title");
          },
        },
        clipboard: {
          get() {
            clipboardReads += 1;
            throw new Error("PRIVATE clipboard");
          },
        },
      }
    ) as QuickAddDefaults;
    const fixture = runtimeFixture();

    await executeQuickAddFromRuntime(fixture.runtime, ports({ loadDefaults: async () => defaults }), {
      text: "No date",
    });

    expect(fixture.createTask).toHaveBeenCalledWith({ title: "No date", projectId: inboxProject.id });
    expect(defaultTitleReads).toBe(0);
    expect(clipboardReads).toBe(0);
  });

  it("applies the loaded default date only after destination resolution", async () => {
    const events: string[] = [];
    const fixture = runtimeFixture({
      listProjects: async () => {
        events.push("catalog");
        return [inboxProject];
      },
      createTask: async (input) => {
        events.push("create");
        return taskFixture(input);
      },
    });
    const loadDefaults = vi.fn(async () => {
      events.push("defaults");
      return {
        defaultDate: new Date("2026-08-15T15:00:00.000Z"),
        uiTimeZone: "America/Denver",
      };
    });

    await executeQuickAddFromRuntime(fixture.runtime, ports({ loadDefaults }), { text: "Dated task" });

    expect(events).toEqual(["catalog", "defaults", "create"]);
    expect(fixture.createTask).toHaveBeenCalledWith({
      title: "Dated task",
      projectId: inboxProject.id,
      dueDate: "2026-08-15T09:00:00.000-06:00",
      isAllDay: false,
      isFloating: true,
      timeZone: "America/Denver",
    });
    expect(loadDefaults).toHaveBeenCalledOnce();
  });

  it("stops before backend create when defaults loading fails", async () => {
    const fixture = runtimeFixture();
    const commandPorts = ports({
      loadDefaults: vi.fn(async () => Promise.reject(new ValidationError("PRIVATE defaults failure"))),
    });

    await executeQuickAddFromRuntime(fixture.runtime, commandPorts, { text: "Defaults fail" });

    expect(fixture.listProjects).toHaveBeenCalledOnce();
    expect(commandPorts.loadDefaults).toHaveBeenCalledOnce();
    expect(fixture.createTask).not.toHaveBeenCalled();
    expect(commandPorts.effects.closeMainWindow).not.toHaveBeenCalled();
    expect(toastCalls(commandPorts.effects).at(-1)).toEqual({
      style: "failure",
      title: "Task Could Not Be Added",
      message: "Review the task details and try again.",
    });
    expect(JSON.stringify(toastCalls(commandPorts.effects))).not.toContain("PRIVATE defaults failure");
  });

  it("preserves ordinary create failure behavior without close or retry", async () => {
    const failure = new NetworkError("PRIVATE network failure");
    const fixture = runtimeFixture({ createTask: async () => Promise.reject(failure) });
    const commandPorts = ports();

    await executeQuickAddFromRuntime(fixture.runtime, commandPorts, { text: "Network failure" });

    expect(fixture.createTask).toHaveBeenCalledOnce();
    expect(commandPorts.loadDefaults).toHaveBeenCalledOnce();
    expect(commandPorts.effects.closeMainWindow).not.toHaveBeenCalled();
    expect(toastCalls(commandPorts.effects).at(-1)).toEqual({
      style: "failure",
      title: "Task Could Not Be Added",
      message: "Couldn't reach TickTick. Retry the change manually.",
    });
  });

  it("preserves terminal ambiguity without close, retry, or private backend content", async () => {
    const fixture = runtimeFixture({
      createTask: async () => Promise.reject(new AmbiguousMutationError("PRIVATE ambiguous backend text")),
    });
    const commandPorts = ports();

    await executeQuickAddFromRuntime(fixture.runtime, commandPorts, { text: "Ambiguous" });

    expect(fixture.createTask).toHaveBeenCalledOnce();
    expect(commandPorts.effects.closeMainWindow).not.toHaveBeenCalled();
    expect(toastCalls(commandPorts.effects).at(-1)).toEqual({
      style: "failure",
      title: "Task Creation Status Unknown",
      message: "TickTick may have created this task. Check TickTick before trying again.",
    });
    expect(JSON.stringify(toastCalls(commandPorts.effects))).not.toContain("PRIVATE ambiguous backend text");
  });

  it("treats malformed confirmation as terminal ambiguity without duplicate create", async () => {
    const fixture = runtimeFixture({
      createTask: async (input) => taskFixture(input, { id: "   " }),
    });
    const commandPorts = ports();

    await executeQuickAddFromRuntime(fixture.runtime, commandPorts, { text: "Malformed confirmation" });

    expect(fixture.createTask).toHaveBeenCalledOnce();
    expect(commandPorts.effects.closeMainWindow).not.toHaveBeenCalled();
    expect(toastCalls(commandPorts.effects).at(-1)?.title).toBe("Task Creation Status Unknown");
  });

  it("keeps progress, success, and close effects best-effort without duplicating confirmed create", async () => {
    const showToast = vi.fn(async () => Promise.reject(new Error("PRIVATE toast failure")));
    const closeMainWindow = vi.fn(async () => Promise.reject(new Error("PRIVATE close failure")));
    const fixture = runtimeFixture();

    await expect(
      executeQuickAddFromRuntime(fixture.runtime, ports({ effects: { showToast, closeMainWindow } }), {
        text: "Effect failures",
      })
    ).resolves.toBeUndefined();

    expect(showToast).toHaveBeenCalledTimes(2);
    expect(closeMainWindow).toHaveBeenCalledOnce();
    expect(fixture.createTask).toHaveBeenCalledOnce();
  });

  it("swallows a failure-toast effect error while preserving the no-close/no-retry path", async () => {
    const showToast = vi
      .fn<(toast: QuickAddCommandToast) => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("PRIVATE failure toast"));
    const closeMainWindow = vi.fn(async () => undefined);
    const fixture = runtimeFixture({ createTask: async () => Promise.reject(new NetworkError("PRIVATE network")) });

    await expect(
      executeQuickAddFromRuntime(fixture.runtime, ports({ effects: { showToast, closeMainWindow } }), {
        text: "Failure effect",
      })
    ).resolves.toBeUndefined();

    expect(showToast).toHaveBeenCalledTimes(2);
    expect(closeMainWindow).not.toHaveBeenCalled();
    expect(fixture.createTask).toHaveBeenCalledOnce();
  });

  it("rejects an untrusted runtime before reading ports or exposing raw identity", async () => {
    const accepted = runtimeFixture().runtime;
    const forged = { ...accepted } as ReadyCommandRuntime;
    const reads = { preferences: 0, loadDefaults: 0, effects: 0 };
    const hostilePorts = Object.defineProperties(
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
            reads.loadDefaults += 1;
            throw new Error("PRIVATE defaults");
          },
        },
        effects: {
          get() {
            reads.effects += 1;
            throw new Error("PRIVATE effects");
          },
        },
      }
    ) as QuickAddCommandRuntimePorts;

    await expect(executeQuickAddFromRuntime(forged, hostilePorts, { text: "Hostile" })).rejects.toEqual(
      new ProtocolError("TickTick task creation runtime is invalid.")
    );
    expect(reads).toEqual({ preferences: 0, loadDefaults: 0, effects: 0 });
  });

  it.each(["effects"] as const)(
    "maps a hostile top-level %s port accessor to fixed privacy-safe failure",
    async (field) => {
      const marker = `PRIVATE-${field}`;
      const fixture = runtimeFixture();
      const values = ports();
      const hostile = Object.defineProperty({ ...values }, field, {
        get() {
          throw new Error(marker);
        },
      });

      let failure: unknown;
      try {
        await executeQuickAddFromRuntime(fixture.runtime, hostile, { text: "Hostile port" });
      } catch (error) {
        failure = error;
      }

      expect(failure).toEqual(new ProtocolError("TickTick Quick Add ports are invalid."));
      expect(String(failure)).not.toContain(marker);
      expect(fixture.listProjects).not.toHaveBeenCalled();
      expect(fixture.createTask).not.toHaveBeenCalled();
    }
  );

  it("treats a hostile preference accessor as unavailable and falls back to real Inbox", async () => {
    const fixture = runtimeFixture();
    const marker = "PRIVATE preference accessor";
    const commandPorts = Object.defineProperty({ ...ports() }, "preferences", {
      get() {
        throw new Error(marker);
      },
    });

    await executeQuickAddFromRuntime(fixture.runtime, commandPorts, { text: "Preference fallback" });

    expect(fixture.createTask).toHaveBeenCalledWith({ title: "Preference fallback", projectId: inboxProject.id });
    expect(JSON.stringify(toastCalls(commandPorts.effects))).not.toContain(marker);
  });

  it("turns a hostile defaults accessor into safe command failure only after destination resolution", async () => {
    const fixture = runtimeFixture();
    const commandPorts = Object.defineProperty({ ...ports() }, "loadDefaults", {
      get() {
        throw new Error("PRIVATE defaults accessor");
      },
    });

    await executeQuickAddFromRuntime(fixture.runtime, commandPorts, { text: "Defaults accessor" });

    expect(fixture.listProjects).toHaveBeenCalledOnce();
    expect(commandPorts.preferences.load).toHaveBeenCalledOnce();
    expect(fixture.createTask).not.toHaveBeenCalled();
    expect(toastCalls(commandPorts.effects).at(-1)).toEqual({
      style: "failure",
      title: "Task Could Not Be Added",
      message: "TickTick returned data this extension could not safely process.",
    });
  });

  it("maps a revoked ports object to fixed failure before command execution", async () => {
    const fixture = runtimeFixture();
    const revoked = Proxy.revocable(ports(), {});
    revoked.revoke();
    const revokedFailure = executeQuickAddFromRuntime(fixture.runtime, revoked.proxy, { text: "Revoked" });

    await expect(revokedFailure).rejects.toEqual(new ProtocolError("TickTick Quick Add ports are invalid."));
  });

  it("snapshots every port accessor once into receiver-preserving frozen wrappers", async () => {
    const fixture = runtimeFixture();
    const reads = {
      preferences: 0,
      preferenceLoad: 0,
      preferenceRemember: 0,
      loadDefaults: 0,
      effects: 0,
      showToast: 0,
      closeMainWindow: 0,
    };
    const preferenceReceiver = {
      get load() {
        reads.preferenceLoad += 1;
        return async function (this: unknown, scope: TaskDestinationScope) {
          expect(this).toBe(preferenceReceiver);
          expect(Object.isFrozen(scope)).toBe(true);
          return inboxProject.id;
        };
      },
      get remember() {
        reads.preferenceRemember += 1;
        return async function (this: unknown) {
          expect(this).toBe(preferenceReceiver);
        };
      },
    };
    const effectsReceiver = {
      get showToast() {
        reads.showToast += 1;
        return async function (this: unknown) {
          expect(this).toBe(effectsReceiver);
        };
      },
      get closeMainWindow() {
        reads.closeMainWindow += 1;
        return async function (this: unknown) {
          expect(this).toBe(effectsReceiver);
        };
      },
    };
    const source = {
      get preferences() {
        reads.preferences += 1;
        return preferenceReceiver;
      },
      get loadDefaults() {
        reads.loadDefaults += 1;
        return async function (this: unknown) {
          expect(this).toBe(source);
          return Object.freeze({});
        };
      },
      get effects() {
        reads.effects += 1;
        return effectsReceiver;
      },
    } as QuickAddCommandRuntimePorts;

    await executeQuickAddFromRuntime(fixture.runtime, source, { text: "Snapshot ports" });

    expect(reads).toEqual({
      preferences: 1,
      preferenceLoad: 1,
      preferenceRemember: 0,
      loadDefaults: 1,
      effects: 1,
      showToast: 1,
      closeMainWindow: 1,
    });
    expect(fixture.createTask).toHaveBeenCalledOnce();
  });

  it("locks the public API and keeps composition free of concrete backends, platform APIs, storage, legacy, and retries", () => {
    const operation: (
      runtime: ReadyCommandRuntime,
      ports: QuickAddCommandRuntimePorts,
      input: QuickAddCommandInput
    ) => Promise<void> = executeQuickAddFromRuntime;
    expect(operation).toBe(executeQuickAddFromRuntime);

    const source = readFileSync(resolve(__dirname, "quickAddCommandRuntime.ts"), "utf8");
    expect(source).not.toMatch(
      /McpTickTickBackend|OpenApiTickTickBackend|MacOsAppleScriptBackend|BackendFactory|@raycast\/api|LocalStorage|run-applescript|\bfetch\b|console\.|setTimeout|retry|JSON\.stringify|String\(|\.toString\(|\.message\b/
    );
  });
});
