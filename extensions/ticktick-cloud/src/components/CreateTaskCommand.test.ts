import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { List, Toast } from "@raycast/api";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { AmbiguousMutationError, AuthenticationError, NetworkError } from "../domain/errors";
import type { CreateTaskInput, Task } from "../domain/task";
import { inboxProject, taskFixture, workProject } from "../test/fixtures/tasks";
import type { ConnectionActionsProps } from "./ConnectionActions";
import type { CreateTaskViewProps } from "./CreateTaskView";
import {
  CreateTaskCommand,
  type CreateTaskCommandProps,
  type CreateTaskReadyRuntime,
  type CreateTaskRecoveryHandlers,
  type CreateTaskRuntime,
} from "./CreateTaskCommand";

const boundary = vi.hoisted(() => ({
  showToast: vi.fn(),
  MockConnectionActions: function MockConnectionActions() {
    return null;
  },
  MockCreateTaskView: function MockCreateTaskView() {
    return null;
  },
}));

vi.mock("@raycast/api", () => {
  const MockActionPanel = function MockActionPanel() {
    return null;
  };
  const MockList = function MockList() {
    return null;
  };
  return {
    ActionPanel: MockActionPanel,
    List: Object.assign(MockList, {
      EmptyView: function MockEmptyView() {
        return null;
      },
    }),
    Toast: { Style: { Failure: "failure" } },
    showToast: boundary.showToast,
  };
});

vi.mock("./ConnectionActions", () => ({
  ConnectionActions: boundary.MockConnectionActions,
  default: boundary.MockConnectionActions,
}));

vi.mock("./CreateTaskView", () => ({ default: boundary.MockCreateTaskView }));

const createdTask = taskFixture({
  id: "created-task",
  projectId: workProject.id,
  projectName: workProject.name,
  title: "PRIVATE created title",
});

function readyRuntime(overrides: Partial<CreateTaskReadyRuntime> = {}): CreateTaskReadyRuntime {
  return {
    kind: "ready",
    contextKey: "mcp:account-a",
    projects: Object.freeze([inboxProject, workProject]),
    uiTimeZone: "America/Denver",
    rememberedProjectId: workProject.id,
    defaultTitle: "Prepared title",
    defaultDate: new Date("2026-08-15T15:00:00.000Z"),
    fieldAvailability: Object.freeze({ project: true, tags: true }),
    createTask: vi.fn(async () => createdTask),
    rememberProjectId: vi.fn(async () => undefined),
    ...overrides,
  };
}

function render(runtime: CreateTaskRuntime): ReactElement {
  return CreateTaskCommand({ runtime });
}

function findElement(root: ReactNode, type: unknown): ReactElement | undefined {
  if (!isValidElement(root)) return undefined;
  if (root.type === type) return root;
  for (const child of Children.toArray((root.props as { children?: ReactNode }).children)) {
    const found = findElement(child, type);
    if (found) return found;
  }
  return undefined;
}

async function runCreateBoundary(props: CreateTaskViewProps, input: CreateTaskInput): Promise<Task> {
  try {
    return await props.createTask(input);
  } catch (error) {
    throw props.mapCreateError ? await props.mapCreateError(error) : error;
  }
}

beforeEach(() => {
  boundary.showToast.mockReset();
  boundary.showToast.mockResolvedValue(undefined);
});

describe("CreateTaskCommand contract", () => {
  it("exports the exact readonly runtime union and props", () => {
    expectTypeOf<CreateTaskCommandProps>().toEqualTypeOf<Readonly<{ runtime: CreateTaskRuntime }>>();
    expectTypeOf<Extract<CreateTaskRuntime, { kind: "loading" }>>().toEqualTypeOf<Readonly<{ kind: "loading" }>>();
    expectTypeOf<CreateTaskRecoveryHandlers>().toMatchTypeOf<
      Readonly<{
        onReconnect?: () => void | Promise<void>;
        onOpenPreferences?: () => void | Promise<void>;
        onRefresh?: () => void | Promise<void>;
        onRetry?: () => void | Promise<void>;
      }>
    >();
  });

  it("renders a neutral loading list without mounting the create form", () => {
    const root = render({ kind: "loading" });

    expect(root.type).toBe(List);
    expect(root.props).toMatchObject({ filtering: false, isLoading: true });
    expect(findElement(root, boundary.MockCreateTaskView)).toBeUndefined();
  });

  it("classifies a bootstrap error to fixed copy and exposes only qualified recovery handlers", () => {
    const onReconnect = vi.fn();
    const onOpenPreferences = vi.fn();
    const marker = "PRIVATE bootstrap token";
    const root = render({
      kind: "error",
      error: new AuthenticationError(marker),
      recovery: { onReconnect, onOpenPreferences },
    });
    const empty = findElement(root, List.EmptyView);
    const actions = findElement(
      (empty?.props as { actions?: ReactNode } | undefined)?.actions,
      boundary.MockConnectionActions
    );

    expect(empty?.props).toMatchObject({
      title: "Reconnect TickTick",
      description: "Your TickTick connection is no longer valid. Reconnect or update authentication in preferences.",
    });
    expect(JSON.stringify(empty?.props)).not.toContain(marker);
    expect(actions?.props).toMatchObject({ onReconnect, onOpenPreferences });
    expect((actions?.props as ConnectionActionsProps).presentation.kind).toBe("authentication");
    expect(findElement(root, boundary.MockCreateTaskView)).toBeUndefined();
  });

  it("forwards only prepared ready values to CreateTaskView without mutation", () => {
    const runtime = Object.freeze(readyRuntime());
    const root = render(runtime);
    const form = findElement(root, boundary.MockCreateTaskView);

    expect(form).toBeDefined();
    expect(form?.props).toMatchObject({
      contextKey: runtime.contextKey,
      projects: runtime.projects,
      uiTimeZone: runtime.uiTimeZone,
      rememberedProjectId: runtime.rememberedProjectId,
      defaultTitle: runtime.defaultTitle,
      defaultDate: runtime.defaultDate,
      fieldAvailability: runtime.fieldAvailability,
    });
    expect((form?.props as CreateTaskViewProps).projects).toBe(runtime.projects);
    expect(runtime.projects).toEqual([inboxProject, workProject]);
  });

  it("calls the injected create once and preserves an exact confirmed task", async () => {
    const createTask = vi.fn(async () => createdTask);
    const form = findElement(render(readyRuntime({ createTask })), boundary.MockCreateTaskView);
    const input: CreateTaskInput = { title: "PRIVATE input", projectId: workProject.id };

    await expect(runCreateBoundary(form?.props as CreateTaskViewProps, input)).resolves.toBe(createdTask);
    expect(createTask).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledWith(input);
    expect(boundary.showToast).not.toHaveBeenCalled();
  });

  it("shows fixed mutation copy and rethrows one cause-free ordinary error for manual retry", async () => {
    const marker = "PRIVATE backend failure";
    const createTask = vi.fn().mockRejectedValue(new NetworkError(marker));
    const form = findElement(render(readyRuntime({ createTask })), boundary.MockCreateTaskView);
    let thrown: unknown;

    try {
      await runCreateBoundary(form?.props as CreateTaskViewProps, {
        title: "PRIVATE title",
        projectId: workProject.id,
      });
    } catch (error) {
      thrown = error;
    }

    expect(createTask).toHaveBeenCalledOnce();
    expect(boundary.showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Couldn't Update Task",
      message: "Couldn't reach TickTick. Retry the change manually.",
    });
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(NetworkError);
    expect(thrown).toMatchObject({ message: "Task could not be created." });
    expect(JSON.stringify(boundary.showToast.mock.calls)).not.toMatch(/PRIVATE|backend failure|PRIVATE title/);
    expect((thrown as Error).cause).toBeUndefined();
  });

  it("rethrows a fresh fixed ambiguous error so the accepted form keeps terminal duplicate protection", async () => {
    const original = new AmbiguousMutationError("PRIVATE ambiguous marker");
    const createTask = vi.fn().mockRejectedValue(original);
    const form = findElement(render(readyRuntime({ createTask })), boundary.MockCreateTaskView);
    let thrown: unknown;

    try {
      await runCreateBoundary(form?.props as CreateTaskViewProps, {
        title: "PRIVATE title",
        projectId: workProject.id,
      });
    } catch (error) {
      thrown = error;
    }

    expect(createTask).toHaveBeenCalledOnce();
    expect(thrown).toBeInstanceOf(AmbiguousMutationError);
    expect(thrown).not.toBe(original);
    expect(thrown).toMatchObject({ message: "Task creation status is unknown. Check TickTick before trying again." });
    expect(boundary.showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Task Update Status Unknown",
      message: "TickTick may have applied this change. Refresh before trying again.",
    });
    expect(JSON.stringify(boundary.showToast.mock.calls)).not.toContain("PRIVATE");
  });

  it("keeps error-toast failure best effort while preserving the fixed rejection", async () => {
    boundary.showToast.mockRejectedValue(new Error("PRIVATE toast failure"));
    const createTask = vi.fn().mockRejectedValue(new NetworkError("PRIVATE network"));
    const form = findElement(render(readyRuntime({ createTask })), boundary.MockCreateTaskView);

    await expect(
      runCreateBoundary(form?.props as CreateTaskViewProps, { title: "Task", projectId: workProject.id })
    ).rejects.toMatchObject({ message: "Task could not be created." });
    expect(createTask).toHaveBeenCalledOnce();
    expect(boundary.showToast).toHaveBeenCalledOnce();
  });

  it("persists only one safely snapshotted confirmed project id", async () => {
    const rememberProjectId = vi.fn(async () => undefined);
    const form = findElement(render(readyRuntime({ rememberProjectId })), boundary.MockCreateTaskView);

    await expect(
      (form?.props as CreateTaskViewProps).onCreated?.(createdTask, workProject.id)
    ).resolves.toBeUndefined();
    expect(rememberProjectId).toHaveBeenCalledOnce();
    expect(rememberProjectId).toHaveBeenCalledWith(workProject.id);
    expect(rememberProjectId.mock.calls[0]).toEqual([workProject.id]);
  });

  it.each([" padded-project ", "bad\u0000project", "\ud800"])(
    "ignores malformed captured confirmation project id %j without calling persistence",
    async (projectId) => {
      const rememberProjectId = vi.fn();
      const form = findElement(render(readyRuntime({ rememberProjectId })), boundary.MockCreateTaskView);

      await expect((form?.props as CreateTaskViewProps).onCreated?.(createdTask, projectId)).resolves.toBeUndefined();
      expect(rememberProjectId).not.toHaveBeenCalled();
    }
  );

  it("uses the captured confirmation id without rereading a hostile task", async () => {
    const rememberProjectId = vi.fn();
    const form = findElement(render(readyRuntime({ rememberProjectId })), boundary.MockCreateTaskView);
    const hostile = Object.defineProperty({ ...createdTask }, "projectId", {
      get() {
        throw new Error("PRIVATE getter");
      },
    });

    await expect((form?.props as CreateTaskViewProps).onCreated?.(hostile, workProject.id)).resolves.toBeUndefined();
    expect(rememberProjectId).toHaveBeenCalledWith(workProject.id);
  });

  it("snapshots the persistence handler once", async () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    let reads = 0;
    const runtime = Object.defineProperty(readyRuntime(), "rememberProjectId", {
      get() {
        reads += 1;
        return reads === 1 ? firstHandler : secondHandler;
      },
    });
    const form = findElement(render(runtime), boundary.MockCreateTaskView);

    await expect(
      (form?.props as CreateTaskViewProps).onCreated?.(createdTask, workProject.id)
    ).resolves.toBeUndefined();

    expect(reads).toBe(1);
    expect(firstHandler).toHaveBeenCalledWith(workProject.id);
    expect(secondHandler).not.toHaveBeenCalled();
  });

  it("keeps the command boundary free of legacy services, concrete backends, storage, network, logging, and timers", () => {
    const source = readFileSync(resolve(__dirname, "CreateTaskCommand.tsx"), "utf8");

    expect(source).not.toMatch(
      /osScript|\.\.\/service|BackendFactory|McpTickTickBackend|OpenApi|fetch\s*\(|LocalStorage/
    );
    expect(source).not.toMatch(/getPreferenceValues|Clipboard|getSelectedText|setTimeout|console\.|\.cause|\.stack/);
    expect(source).not.toMatch(/modifiers\s*:\s*\[\s*["']cmd["']\s*\]/);
  });
});
