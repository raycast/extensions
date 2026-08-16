import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { AmbiguousMutationError, AuthenticationError, NetworkError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { CreateTaskInput, Task } from "../domain/task";
import type { TaskDestinationPreferencePort } from "../application/taskDestination";
import {
  executeQuickAddCommand,
  presentQuickAddCommandFailure,
  type QuickAddCommandDependencies,
  type QuickAddCommandEffects,
  type QuickAddCommandInput,
  type QuickAddCommandToast,
} from "./executeQuickAddCommand";

const SAFE_UNKNOWN_MESSAGE = "TickTick couldn't complete the request.";
const SAFE_NETWORK_MESSAGE = "Couldn't reach TickTick. Retry the change manually.";
const SAFE_AUTH_MESSAGE =
  "Your TickTick connection is no longer valid. Reconnect or update authentication in preferences.";
const SAFE_PROTOCOL_MESSAGE = "TickTick returned data this extension could not safely process.";
const AMBIGUOUS_GUIDANCE = "TickTick may have created this task. Check TickTick before trying again.";

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

function effects(overrides: Partial<QuickAddCommandEffects> = {}): QuickAddCommandEffects {
  return {
    showToast: vi.fn(async () => undefined),
    closeMainWindow: vi.fn(async () => undefined),
    ...overrides,
  };
}

function dependencies(
  overrides: Partial<{
    projects: readonly Project[];
    listProjects(): Promise<readonly Project[]>;
    preferences: TaskDestinationPreferencePort;
    preferredProjectId: string | undefined;
    createTask(input: CreateTaskInput): Promise<Task>;
    effects: QuickAddCommandEffects;
  }> = {}
): QuickAddCommandDependencies {
  const projects = overrides.projects ?? [inboxProject, workProject];
  const preferences =
    overrides.preferences ??
    ({
      load: vi.fn(async () => overrides.preferredProjectId),
      remember: vi.fn(async () => undefined),
    } satisfies TaskDestinationPreferencePort);

  return {
    scope: Object.freeze({ backendId: "mcp", accountKey: "account-key" }),
    listProjects: overrides.listProjects ?? vi.fn(async () => projects),
    preferences,
    createTask: overrides.createTask ?? vi.fn(async (input) => taskFixture(input)),
    effects: overrides.effects ?? effects(),
  };
}

function toastCalls(deps: QuickAddCommandDependencies): QuickAddCommandToast[] {
  return vi.mocked(deps.effects.showToast).mock.calls.map(([toast]) => toast);
}

function deferred<Value>() {
  let resolvePromise!: (value: Value) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<Value>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

describe("executeQuickAddCommand", () => {
  it("exports the single privacy-safe Quick Add failure-presentation policy", () => {
    expectTypeOf(presentQuickAddCommandFailure).parameter(0).toEqualTypeOf<unknown>();
    expectTypeOf(presentQuickAddCommandFailure).returns.toEqualTypeOf<QuickAddCommandToast>();

    expect(presentQuickAddCommandFailure(new Error("private ordinary failure"))).toEqual({
      style: "failure",
      title: "Task Could Not Be Added",
      message: SAFE_UNKNOWN_MESSAGE,
    });
    expect(presentQuickAddCommandFailure(new AmbiguousMutationError("private ambiguous failure"))).toEqual({
      style: "failure",
      title: "Task Creation Status Unknown",
      message: AMBIGUOUS_GUIDANCE,
    });
  });

  it("bounds hostile failure classification to safe prototype checks and never leaks it", () => {
    const privateMarker = "private-hostile-failure";
    const reads: PropertyKey[] = [];
    const hostile = new Proxy(Object.create(null) as object, {
      get(_target, property) {
        reads.push(property);
        throw new Error(privateMarker);
      },
      getPrototypeOf() {
        reads.push("[[Prototype]]");
        throw new Error(privateMarker);
      },
    });

    const toast = presentQuickAddCommandFailure(hostile);

    expect(toast).toEqual({
      style: "failure",
      title: "Task Could Not Be Added",
      message: SAFE_UNKNOWN_MESSAGE,
    });
    expect(JSON.stringify(toast)).not.toContain(privateMarker);
    expect(reads.length).toBeGreaterThan(0);
    expect(reads.every((read) => read === "[[Prototype]]")).toBe(true);
  });

  it("shows progress before catalog and create work, then succeeds and clears the root search", async () => {
    const events: string[] = [];
    const commandEffects = effects({
      showToast: vi.fn(async (toast) => {
        events.push(`toast:${toast.title}`);
      }),
      closeMainWindow: vi.fn(async (options) => {
        events.push(`close:${String(options.clearRootSearch)}`);
      }),
    });
    const listProjects = vi.fn(async () => {
      events.push("catalog");
      return [inboxProject];
    });
    const createTask = vi.fn(async (input: CreateTaskInput) => {
      events.push("create");
      return taskFixture(input);
    });
    const deps = dependencies({ listProjects, createTask, effects: commandEffects });

    await executeQuickAddCommand(deps, { text: "Task" });

    expect(events).toEqual(["toast:Adding Task", "catalog", "create", "toast:Task Added", "close:true"]);
    expect(listProjects).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledOnce();
    expect(commandEffects.closeMainWindow).toHaveBeenCalledWith({ clearRootSearch: true });
  });

  it("prefers text over fallback, trims strings through runQuickAdd, and omits all private input from effects", async () => {
    const deps = dependencies({ preferredProjectId: workProject.id });
    const text = "  private-primary-title  ";
    const fallbackText = "private-fallback-title";
    const description = "  private-description  ";

    await executeQuickAddCommand(deps, { text, fallbackText, description });

    expect(deps.createTask).toHaveBeenCalledWith({
      title: "private-primary-title",
      description: "private-description",
      projectId: workProject.id,
    });
    expect(deps.createTask).toHaveBeenCalledOnce();
    const renderedEffects = JSON.stringify([
      vi.mocked(deps.effects.showToast).mock.calls,
      vi.mocked(deps.effects.closeMainWindow).mock.calls,
    ]);
    for (const marker of [text.trim(), fallbackText, description.trim(), workProject.id]) {
      expect(renderedEffects).not.toContain(marker);
    }
  });

  it.each([undefined, null, 42, false, { private: "object" }])(
    "uses fallback text without coercing a non-string primary value (%j)",
    async (text) => {
      const hostileDescription = {
        toString() {
          throw new Error("description must not be coerced");
        },
      };
      const deps = dependencies();

      await executeQuickAddCommand(deps, {
        text,
        fallbackText: "  fallback task  ",
        description: hostileDescription,
      });

      expect(deps.createTask).toHaveBeenCalledWith({ title: "fallback task", projectId: inboxProject.id });
      expect(deps.createTask).toHaveBeenCalledOnce();
    }
  );

  it("snapshots each input field once, isolates hostile getters, and never coerces values", async () => {
    const reads = { text: 0, fallbackText: 0, description: 0 };
    const input = Object.defineProperties(
      {},
      {
        text: {
          get() {
            reads.text += 1;
            return {
              toString() {
                throw new Error("primary must not be coerced");
              },
            };
          },
        },
        fallbackText: {
          get() {
            reads.fallbackText += 1;
            return "fallback snapshot";
          },
        },
        description: {
          get() {
            reads.description += 1;
            throw new Error("private description getter");
          },
        },
      }
    ) as QuickAddCommandInput;
    const deps = dependencies();

    await executeQuickAddCommand(deps, input);

    expect(reads).toEqual({ text: 1, fallbackText: 1, description: 1 });
    expect(deps.createTask).toHaveBeenCalledWith({ title: "fallback snapshot", projectId: inboxProject.id });
    expect(JSON.stringify(toastCalls(deps))).not.toContain("private description getter");
  });

  it("uses the authoritative remembered project and falls back from a stale preference only to real Inbox", async () => {
    const preferred = dependencies({ preferredProjectId: workProject.id });
    await executeQuickAddCommand(preferred, { text: "Remembered" });
    expect(preferred.createTask).toHaveBeenCalledWith({ title: "Remembered", projectId: workProject.id });

    const stale = dependencies({
      projects: [workProject, inboxProject],
      preferredProjectId: "stale-private-project",
    });
    await executeQuickAddCommand(stale, { text: "Inbox fallback" });
    expect(stale.createTask).toHaveBeenCalledWith({ title: "Inbox fallback", projectId: inboxProject.id });
  });

  it("remains pending until exact task confirmation and performs no success effect early", async () => {
    const confirmation = deferred<Task>();
    const createTask = vi.fn<(input: CreateTaskInput) => Promise<Task>>().mockReturnValue(confirmation.promise);
    const deps = dependencies({ createTask });
    let settled = false;

    const running = executeQuickAddCommand(deps, { text: "Private pending task" }).then(() => {
      settled = true;
    });

    await vi.waitFor(() => expect(createTask).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    expect(toastCalls(deps)).toEqual([{ style: "animated", title: "Adding Task" }]);
    expect(deps.effects.closeMainWindow).not.toHaveBeenCalled();

    confirmation.resolve(taskFixture({ title: "Private pending task", projectId: inboxProject.id }));
    await running;

    expect(toastCalls(deps)).toEqual([
      { style: "animated", title: "Adding Task" },
      { style: "success", title: "Task Added" },
    ]);
    expect(deps.effects.closeMainWindow).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledOnce();
  });

  it("continues after a progress-toast failure without retrying creation", async () => {
    const showToast = vi
      .fn<(toast: QuickAddCommandToast) => Promise<void>>()
      .mockRejectedValueOnce(new Error("progress UI unavailable"))
      .mockResolvedValue(undefined);
    const deps = dependencies({ effects: effects({ showToast }) });

    await expect(executeQuickAddCommand(deps, { text: "Task" })).resolves.toBeUndefined();

    expect(deps.createTask).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledTimes(2);
    expect(deps.effects.closeMainWindow).toHaveBeenCalledOnce();
  });

  it("treats success toast and close failures as independent best-effort post-confirm effects", async () => {
    const showToast = vi
      .fn<(toast: QuickAddCommandToast) => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("success toast failed"));
    const closeMainWindow = vi.fn().mockRejectedValue(new Error("close failed"));
    const deps = dependencies({ effects: effects({ showToast, closeMainWindow }) });

    await expect(executeQuickAddCommand(deps, { text: "Task" })).resolves.toBeUndefined();

    expect(deps.createTask).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledTimes(2);
    expect(closeMainWindow).toHaveBeenCalledOnce();
    expect(closeMainWindow).toHaveBeenCalledWith({ clearRootSearch: true });
  });

  it.each([
    ["unknown", new Error("private-backend-error"), SAFE_UNKNOWN_MESSAGE],
    ["network", new NetworkError("private-network-error"), SAFE_NETWORK_MESSAGE],
    ["authentication", new AuthenticationError("private-auth-error"), SAFE_AUTH_MESSAGE],
  ])(
    "shows a fixed safe ordinary failure for a %s create error without close or retry",
    async (_case, failure, message) => {
      const createTask = vi.fn().mockRejectedValue(failure);
      const deps = dependencies({ createTask });

      await expect(
        executeQuickAddCommand(deps, { text: "private-title", description: "private-description" })
      ).resolves.toBeUndefined();

      expect(createTask).toHaveBeenCalledOnce();
      expect(toastCalls(deps).at(-1)).toEqual({ style: "failure", title: "Task Could Not Be Added", message });
      expect(deps.effects.closeMainWindow).not.toHaveBeenCalled();
      const rendered = JSON.stringify(toastCalls(deps));
      for (const marker of ["private-title", "private-description", (failure as Error).message]) {
        expect(rendered).not.toContain(marker);
      }
    }
  );

  it("shows a fixed safe failure when destination resolution fails and never creates or closes", async () => {
    const privateMarker = "private-catalog-error";
    const listProjects = vi.fn().mockRejectedValue(new NetworkError(privateMarker));
    const deps = dependencies({ listProjects });

    await executeQuickAddCommand(deps, { text: "private-title" });

    expect(deps.createTask).not.toHaveBeenCalled();
    expect(toastCalls(deps).at(-1)).toEqual({
      style: "failure",
      title: "Task Could Not Be Added",
      message: SAFE_NETWORK_MESSAGE,
    });
    expect(JSON.stringify(toastCalls(deps))).not.toContain(privateMarker);
    expect(deps.effects.closeMainWindow).not.toHaveBeenCalled();
  });

  it("never substitutes an arbitrary project when no real Inbox or remembered destination exists", async () => {
    const deps = dependencies({
      projects: [workProject],
      preferredProjectId: "missing-project",
    });

    await executeQuickAddCommand(deps, { text: "private-title" });

    expect(deps.createTask).not.toHaveBeenCalled();
    expect(toastCalls(deps).at(-1)).toEqual({
      style: "failure",
      title: "Task Could Not Be Added",
      message: SAFE_PROTOCOL_MESSAGE,
    });
    expect(deps.effects.closeMainWindow).not.toHaveBeenCalled();
  });

  it("uses terminal create-ambiguity guidance without close, retry, or raw backend text", async () => {
    const privateMarker = "private-ambiguous-backend-error";
    const createTask = vi.fn().mockRejectedValue(new AmbiguousMutationError(privateMarker));
    const deps = dependencies({ createTask });

    await executeQuickAddCommand(deps, { text: "private-title", description: "private-description" });

    expect(createTask).toHaveBeenCalledOnce();
    expect(toastCalls(deps).at(-1)).toEqual({
      style: "failure",
      title: "Task Creation Status Unknown",
      message: AMBIGUOUS_GUIDANCE,
    });
    expect(JSON.stringify(toastCalls(deps))).not.toContain(privateMarker);
    expect(deps.effects.closeMainWindow).not.toHaveBeenCalled();
  });

  it("treats a malformed post-create confirmation as ambiguity without close or duplicate create", async () => {
    const privateMarker = "private-confirmation-id";
    const createTask = vi.fn(async (input: CreateTaskInput) =>
      taskFixture(input, { id: " ", title: privateMarker, content: "private-content" })
    );
    const deps = dependencies({ createTask });

    await executeQuickAddCommand(deps, { text: "private-title" });

    expect(createTask).toHaveBeenCalledOnce();
    expect(toastCalls(deps).at(-1)).toEqual({
      style: "failure",
      title: "Task Creation Status Unknown",
      message: AMBIGUOUS_GUIDANCE,
    });
    expect(JSON.stringify(toastCalls(deps))).not.toContain(privateMarker);
    expect(deps.effects.closeMainWindow).not.toHaveBeenCalled();
  });

  it("swallows a failure-toast rejection and still never closes or retries", async () => {
    const showToast = vi
      .fn<(toast: QuickAddCommandToast) => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("failure toast failed"));
    const createTask = vi.fn().mockRejectedValue(new Error("create failed"));
    const deps = dependencies({ createTask, effects: effects({ showToast }) });

    await expect(executeQuickAddCommand(deps, { text: "Task" })).resolves.toBeUndefined();

    expect(createTask).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledTimes(2);
    expect(deps.effects.closeMainWindow).not.toHaveBeenCalled();
  });

  it("uses no timers, legacy service, backend implementation, or raw logging", () => {
    const source = readFileSync(resolve(__dirname, "executeQuickAddCommand.ts"), "utf8");

    expect(source).not.toMatch(/setTimeout|setInterval|console\.|service\/osScript|service\/project|BackendFactory/);
    expect(source).toContain("dependencies.effects.showToast(presentQuickAddCommandFailure(error))");
    expect(source).not.toMatch(/function\s+failureToast\b/);
  });
});
