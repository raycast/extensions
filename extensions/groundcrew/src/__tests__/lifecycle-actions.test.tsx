import { createElement, type ReactElement, type ReactNode } from "react";
import { confirmAlert, showToast } from "@raycast/api";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findCanonicalTask,
  findLifecycleTask,
  getLifecycleAvailability,
  LifecycleActions,
  type LifecycleMutations,
  useLifecycleActionController,
} from "../components/lifecycle-actions";
import type { GroundcrewStatusInventory, GroundcrewStatusTask, GroundcrewTask } from "../types/groundcrew";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@raycast/api", () => {
  function mockComponent(name: string, renderProps: string[] = []) {
    return function MockComponent(props: Record<string, unknown>) {
      const children = [props.children, ...renderProps.map((property) => props[property])];
      return createElement(name, props, ...(children as ReactNode[]));
    };
  }

  const Action = Object.assign(mockComponent("raycast-action"), {
    Push: mockComponent("raycast-action-push", ["target"]),
    Style: { Destructive: "destructive" },
    SubmitForm: mockComponent("raycast-action-submit-form"),
  });
  const Form = Object.assign(mockComponent("raycast-form", ["actions"]), {
    TextArea: mockComponent("raycast-form-text-area"),
  });

  return {
    Action,
    ActionPanel: mockComponent("raycast-action-panel"),
    Alert: { ActionStyle: { Destructive: "destructive" } },
    confirmAlert: vi.fn(),
    Form,
    Icon: new Proxy({}, { get: (_target, property) => String(property) }),
    showToast: vi.fn(),
    Toast: { Style: { Animated: "animated", Failure: "failure", Success: "success" } },
    useNavigation: () => ({ pop: vi.fn() }),
  };
});

const canonicalTask: GroundcrewTask = {
  id: "linear:TEM-3897",
  source: "linear",
  title: "Add lifecycle actions",
  description: "",
  status: "todo",
  repository: "ClipboardHealth/groundcrew-raycast",
  agent: "codex",
  assignee: "Shubham",
  updatedAt: "2026-08-20T09:00:00.000Z",
  blockers: [],
  hasMoreBlockers: false,
};

function localTask(overrides: Partial<GroundcrewStatusTask> = {}): GroundcrewStatusTask {
  return {
    task: "tem-3897",
    lifecycle: "running",
    flags: [],
    session: "live",
    worktrees: [
      {
        repository: "groundcrew-raycast",
        kind: "host",
        dir: "/work/groundcrew-raycast-tem-3897",
        branch: "shubhsherl-tem-3897",
        git: { kind: "clean" },
        pullRequests: [],
      },
    ],
    recentLogLines: [],
    source: {
      id: canonicalTask.id,
      naturalId: "tem-3897",
      title: canonicalTask.title,
      repository: canonicalTask.repository,
      agent: canonicalTask.agent,
      status: canonicalTask.status,
    },
    ...overrides,
  };
}

function statusInventory(tasks: GroundcrewStatusTask[]): GroundcrewStatusInventory {
  return {
    schemaVersion: 1,
    localCapturedAt: "2026-08-20T09:00:00.000Z",
    remote: {
      lastAttemptAt: "2026-08-20T09:00:01.000Z",
      lastAttemptStatus: "ok",
      capturedAt: "2026-08-20T09:00:01.000Z",
    },
    maximumInProgress: 3,
    workspaceProbe: { status: "ok" },
    orphanedSessions: [],
    tasks,
    inProgressWithoutWorktree: [],
    queueReady: [],
    queueBlocked: [],
    slots: { used: tasks.length, maximum: 3 },
  };
}

function findByType(renderer: ReactTestRenderer, type: string): ReactTestInstance[] {
  return renderer.root.findAll((node) => node.type === type);
}

async function render(element: ReactElement): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(element);
    await Promise.resolve();
  });
  if (renderer === undefined) {
    throw new Error("Renderer was not created.");
  }
  return renderer;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("lifecycle action availability", () => {
  it("uses canonical eligibility and refreshed local lifecycle state", () => {
    expect(getLifecycleAvailability(canonicalTask)).toEqual({
      cleanup: false,
      resume: false,
      start: true,
      stop: false,
      done: true,
    });

    const active = findLifecycleTask(statusInventory([localTask()]), canonicalTask.id);
    expect(getLifecycleAvailability(canonicalTask, active)).toEqual({
      cleanup: false,
      resume: false,
      start: false,
      stop: true,
      done: true,
    });

    const interrupted = findLifecycleTask(
      statusInventory([localTask({ lifecycle: "interrupted", session: "not-live" })]),
      canonicalTask.id,
    );
    expect(getLifecycleAvailability({ ...canonicalTask, status: "in-progress" }, interrupted)).toEqual({
      cleanup: true,
      resume: true,
      start: false,
      stop: false,
      done: true,
    });

    const failedLaunch = findLifecycleTask(
      statusInventory([localTask({ lifecycle: "failed-to-launch", session: "unknown", worktrees: [] })]),
      canonicalTask.id,
    );
    expect(getLifecycleAvailability({ ...canonicalTask, status: "in-progress" }, failedLaunch)).toEqual({
      cleanup: true,
      resume: false,
      start: false,
      stop: false,
      done: true,
    });

    expect(
      getLifecycleAvailability({
        ...canonicalTask,
        blockers: [{ id: "linear:TEM-1", title: "Blocked", status: "in-progress" }],
      }),
    ).toEqual({ cleanup: false, resume: false, start: false, stop: false, done: true });

    const missingInventory = statusInventory([]);
    missingInventory.inProgressWithoutWorktree.push({
      id: canonicalTask.id,
      naturalId: "tem-3897",
      title: canonicalTask.title,
    });
    expect(getLifecycleAvailability(canonicalTask, findLifecycleTask(missingInventory, canonicalTask.id))).toEqual({
      cleanup: false,
      resume: false,
      start: false,
      stop: false,
      done: true,
    });
  });

  it("keeps provider-qualified tasks distinct when natural ids collide", () => {
    const inventory = statusInventory([
      localTask(),
      localTask({
        source: {
          id: "jira:tem-3897",
          naturalId: "tem-3897",
          title: canonicalTask.title,
          repository: canonicalTask.repository,
          agent: canonicalTask.agent,
          status: canonicalTask.status,
        },
      }),
    ]);
    const tasks = [canonicalTask, { ...canonicalTask, id: "jira:tem-3897", source: "jira" }];

    expect(findLifecycleTask(inventory, "linear:tem-3897")).toMatchObject({
      kind: "local",
      task: { source: { id: canonicalTask.id } },
    });
    expect(findLifecycleTask(inventory, "jira:tem-3897")).toMatchObject({
      kind: "local",
      task: { source: { id: "jira:tem-3897" } },
    });
    expect(findLifecycleTask(inventory, "tem-3897")).toBeUndefined();
    expect(findCanonicalTask(tasks, "linear:tem-3897")?.source).toBe("linear");
    expect(findCanonicalTask(tasks, "tem-3897")).toBeUndefined();
  });

  it("uses a source-less local status only when the canonical natural id is unique", () => {
    const inventory = statusInventory([localTask({ source: undefined })]);
    const collidingTasks = [canonicalTask, { ...canonicalTask, id: "jira:tem-3897", source: "jira" }];

    expect(findLifecycleTask(inventory, canonicalTask.id)).toBeUndefined();
    expect(findLifecycleTask(inventory, canonicalTask.id, [canonicalTask])).toMatchObject({
      kind: "local",
      task: { task: "tem-3897" },
    });
    expect(findLifecycleTask(inventory, canonicalTask.id, collidingTasks)).toBeUndefined();
  });
});

describe("lifecycle mutation feedback", () => {
  it("shows cancelable progress, refreshes both data sources, and reports refreshed state", async () => {
    const toast = {
      message: undefined as string | undefined,
      primaryAction: undefined as { title: string; onAction: () => void } | undefined,
      style: "animated",
      title: "",
    };
    vi.mocked(showToast).mockResolvedValue(toast as never);
    const startTask = vi.fn<LifecycleMutations["startTask"]>().mockResolvedValue({
      kind: "success",
      exitCode: 0,
      stdout: "human text that must stay opaque",
      stderr: "another human diagnostic",
    });
    const mutations: LifecycleMutations = {
      startTask,
      stopTask: vi.fn(),
      resumeTask: vi.fn(),
      cleanupTask: vi.fn(),
      completeTask: vi.fn(),
    };
    const refreshedTask = { ...canonicalTask, status: "in-progress" as const };
    const refreshedStatus = findLifecycleTask(statusInventory([localTask()]), canonicalTask.id);
    const reconcile = vi.fn(async () => ({
      status: refreshedStatus,
      statusRefreshed: true,
      task: refreshedTask,
      taskRefreshed: true,
    }));

    function Harness() {
      const controller = useLifecycleActionController({ mutations, reconcile });
      return <LifecycleActions controller={controller} taskId={canonicalTask.id} task={canonicalTask} />;
    }

    const renderer = await render(<Harness />);
    const start = findByType(renderer, "raycast-action").find((action) => action.props.title === "Start Task");
    await act(async () => {
      await start?.props.onAction();
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "animated",
        title: "Starting Task",
        primaryAction: expect.objectContaining({ title: "Cancel" }),
      }),
    );
    expect(startTask).toHaveBeenCalledWith(
      canonicalTask.id,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(reconcile).toHaveBeenCalledWith(canonicalTask.id);
    expect(toast).toMatchObject({
      style: "success",
      title: "Task Started",
      message: "Task: In Progress · Lifecycle: Running · Session: Live",
      primaryAction: undefined,
    });
    expect(toast.message).not.toContain("human");
  });

  it("disables conflicting actions, aborts the client process, and refreshes after cancellation", async () => {
    const toast = {
      message: undefined as string | undefined,
      primaryAction: undefined as { title: string; onAction: () => void } | undefined,
      style: "animated",
      title: "",
    };
    vi.mocked(showToast).mockResolvedValue(toast as never);
    let receivedSignal: AbortSignal | undefined;
    const resumeTask = vi.fn<LifecycleMutations["resumeTask"]>(
      async (_taskId, options) =>
        await new Promise((resolve) => {
          receivedSignal = options?.signal;
          options?.signal?.addEventListener(
            "abort",
            () => resolve({ kind: "canceled", stdout: "cancel prose", stderr: "" }),
            { once: true },
          );
        }),
    );
    const reconcile = vi.fn(async () => ({
      statusRefreshed: true,
      task: canonicalTask,
      taskRefreshed: true,
    }));

    function Harness() {
      const controller = useLifecycleActionController({
        mutations: {
          startTask: vi.fn(),
          stopTask: vi.fn(),
          resumeTask,
          cleanupTask: vi.fn(),
          completeTask: vi.fn(),
        },
        reconcile,
      });
      const interrupted = findLifecycleTask(
        statusInventory([localTask({ lifecycle: "interrupted", session: "not-live" })]),
        canonicalTask.id,
      );
      return (
        <LifecycleActions
          controller={controller}
          taskId={canonicalTask.id}
          task={{ ...canonicalTask, status: "in-progress" }}
          status={interrupted}
        />
      );
    }

    const renderer = await render(<Harness />);
    let mutation: Promise<void> | undefined;
    await act(async () => {
      const resume = findByType(renderer, "raycast-action").find((action) => action.props.title === "Resume Task");
      mutation = resume?.props.onAction();
      await Promise.resolve();
    });

    expect(
      findByType(renderer, "raycast-action")
        .filter((action) => ["Resume Task", "Cleanup Task"].includes(action.props.title))
        .map((action) => action.props.onAction),
    ).toEqual([undefined, undefined]);
    const progressOptions = vi.mocked(showToast).mock.calls[0]?.[0] as unknown as {
      primaryAction?: { onAction?: () => void };
    };
    await act(async () => {
      progressOptions?.primaryAction?.onAction?.();
      await mutation;
    });

    expect(receivedSignal?.aborted).toBe(true);
    expect(reconcile).toHaveBeenCalledWith(canonicalTask.id);
    expect(toast).toMatchObject({
      style: "failure",
      title: "Resume Canceled",
      message: "Task: Todo",
      primaryAction: undefined,
    });
  });

  it.each([
    {
      result: {
        kind: "failure" as const,
        exitCode: 9,
        signal: null,
        stdout: "pretend success",
        stderr: "specific failure surfaced to the user",
      },
      expectedMessage: "specific failure surfaced to the user",
    },
    {
      result: { kind: "timeout" as const, stdout: "", stderr: "specific timeout" },
      expectedMessage: "specific timeout",
    },
    {
      result: {
        kind: "launch-failure" as const,
        error: new Error("specific launch error"),
        stdout: "",
        stderr: "",
      },
      expectedMessage: "specific launch error",
    },
  ])("surfaces the crew error for $result.kind and still reconciles", async ({ result, expectedMessage }) => {
    const toast = { message: undefined, primaryAction: undefined, style: "", title: "" };
    vi.mocked(showToast).mockResolvedValue(toast as never);
    const reconcile = vi.fn(async () => ({ statusRefreshed: true, taskRefreshed: true }));

    function Harness() {
      const controller = useLifecycleActionController({
        mutations: {
          startTask: vi.fn().mockResolvedValue(result),
          stopTask: vi.fn(),
          resumeTask: vi.fn(),
          cleanupTask: vi.fn(),
          completeTask: vi.fn(),
        },
        reconcile,
      });
      return <LifecycleActions controller={controller} taskId={canonicalTask.id} task={canonicalTask} />;
    }

    const renderer = await render(<Harness />);
    const start = findByType(renderer, "raycast-action").find((action) => action.props.title === "Start Task");
    await act(async () => {
      await start?.props.onAction();
    });

    expect(reconcile).toHaveBeenCalledWith(canonicalTask.id);
    expect(toast).toMatchObject({
      style: "failure",
      title: "Couldn’t Start Task",
      message: expectedMessage,
    });
  });
});

describe("lifecycle action inputs", () => {
  it("passes an optional stop reason as data", async () => {
    vi.mocked(showToast).mockResolvedValue({} as never);
    const stopTask = vi.fn<LifecycleMutations["stopTask"]>().mockResolvedValue({
      kind: "success",
      exitCode: 0,
      stdout: "",
      stderr: "",
    });
    const active = findLifecycleTask(statusInventory([localTask()]), canonicalTask.id);

    function Harness() {
      const controller = useLifecycleActionController({
        mutations: {
          startTask: vi.fn(),
          stopTask,
          resumeTask: vi.fn(),
          cleanupTask: vi.fn(),
          completeTask: vi.fn(),
        },
        reconcile: async () => ({ statusRefreshed: true, taskRefreshed: true }),
      });
      return (
        <LifecycleActions
          controller={controller}
          taskId={canonicalTask.id}
          task={{ ...canonicalTask, status: "in-progress" }}
          status={active}
        />
      );
    }

    const renderer = await render(<Harness />);
    const submit = findByType(renderer, "raycast-action-submit-form")[0];
    const reason = "paused because $(touch /tmp/never-run)";
    await act(async () => {
      await submit?.props.onSubmit({ reason });
    });

    expect(stopTask).toHaveBeenCalledWith(
      "tem-3897",
      expect.objectContaining({ reason, signal: expect.any(AbortSignal) }),
    );
  });

  it("requires destructive confirmation before cleanup", async () => {
    vi.mocked(showToast).mockResolvedValue({} as never);
    const cleanupTask = vi.fn<LifecycleMutations["cleanupTask"]>().mockResolvedValue({
      kind: "success",
      exitCode: 0,
      stdout: "",
      stderr: "",
    });
    const interrupted = findLifecycleTask(
      statusInventory([localTask({ lifecycle: "interrupted", session: "not-live" })]),
      canonicalTask.id,
    );

    function Harness() {
      const controller = useLifecycleActionController({
        mutations: {
          startTask: vi.fn(),
          stopTask: vi.fn(),
          resumeTask: vi.fn(),
          cleanupTask,
        },
        reconcile: async () => ({ statusRefreshed: true, taskRefreshed: true }),
      });
      return (
        <LifecycleActions
          controller={controller}
          taskId={canonicalTask.id}
          task={{ ...canonicalTask, status: "in-progress" }}
          status={interrupted}
        />
      );
    }

    const renderer = await render(<Harness />);
    const cleanup = findByType(renderer, "raycast-action").find((action) => action.props.title === "Cleanup Task");
    vi.mocked(confirmAlert).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await act(async () => {
      await cleanup?.props.onAction();
    });
    expect(cleanupTask).not.toHaveBeenCalled();
    await act(async () => {
      await cleanup?.props.onAction();
    });

    expect(confirmAlert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: `Cleanup ${canonicalTask.id}?`,
        primaryAction: expect.objectContaining({
          title: "Cleanup Task",
          style: "destructive",
        }),
      }),
    );
    expect(cleanupTask).toHaveBeenCalledWith("tem-3897", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("passes force to a confirmed force cleanup", async () => {
    vi.mocked(showToast).mockResolvedValue({} as never);
    const cleanupTask = vi.fn<LifecycleMutations["cleanupTask"]>().mockResolvedValue({
      kind: "success",
      exitCode: 0,
      stdout: "",
      stderr: "",
    });
    const interrupted = findLifecycleTask(
      statusInventory([localTask({ lifecycle: "interrupted", session: "not-live" })]),
      canonicalTask.id,
    );

    function Harness() {
      const controller = useLifecycleActionController({
        mutations: {
          startTask: vi.fn(),
          stopTask: vi.fn(),
          resumeTask: vi.fn(),
          cleanupTask,
          completeTask: vi.fn(),
        },
        reconcile: async () => ({ statusRefreshed: true, taskRefreshed: true }),
      });
      return (
        <LifecycleActions
          controller={controller}
          taskId={canonicalTask.id}
          task={{ ...canonicalTask, status: "in-progress" }}
          status={interrupted}
        />
      );
    }

    const renderer = await render(<Harness />);
    const forceCleanup = findByType(renderer, "raycast-action").find(
      (action) => action.props.title === "Cleanup Task (Force)",
    );
    vi.mocked(confirmAlert).mockResolvedValue(true);
    await act(async () => {
      await forceCleanup?.props.onAction();
    });

    expect(confirmAlert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: `Force cleanup ${canonicalTask.id}?`,
        primaryAction: expect.objectContaining({
          title: "Force Cleanup Task",
          style: "destructive",
        }),
      }),
    );
    expect(cleanupTask).toHaveBeenCalledWith(
      "tem-3897",
      expect.objectContaining({ force: true, signal: expect.any(AbortSignal) }),
    );
  });
});
