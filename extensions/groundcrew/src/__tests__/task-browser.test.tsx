import { createElement, type ReactElement, type ReactNode } from "react";
import { showToast } from "@raycast/api";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import taskDetailFixture from "./fixtures/task-detail.json";
import taskListFixture from "./fixtures/task-list.json";
import { GroundcrewClientError } from "../cli";
import { TaskBrowser, TaskDetail } from "../components/task-browser";
import type { LifecycleMutations } from "../components/lifecycle-actions";
import type { GroundcrewStatusInventory, GroundcrewTask } from "../types/groundcrew";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@raycast/api", () => {
  function mockComponent(name: string, renderProps: string[] = []) {
    return function MockComponent(props: Record<string, unknown>) {
      const children = [props.children, ...renderProps.map((property) => props[property])];
      return createElement(name, props, ...(children as ReactNode[]));
    };
  }

  const List = Object.assign(mockComponent("raycast-list", ["searchBarAccessory", "actions"]), {
    Dropdown: Object.assign(mockComponent("raycast-list-dropdown"), {
      Item: mockComponent("raycast-list-dropdown-item"),
    }),
    EmptyView: mockComponent("raycast-list-empty-view", ["actions"]),
    Item: mockComponent("raycast-list-item", ["actions"]),
    Section: mockComponent("raycast-list-section"),
  });
  const Detail = Object.assign(mockComponent("raycast-detail", ["metadata", "actions"]), {
    Metadata: Object.assign(mockComponent("raycast-detail-metadata"), {
      Label: mockComponent("raycast-detail-metadata-label"),
      Link: mockComponent("raycast-detail-metadata-link"),
      Separator: mockComponent("raycast-detail-metadata-separator"),
      TagList: Object.assign(mockComponent("raycast-detail-metadata-tag-list"), {
        Item: mockComponent("raycast-detail-metadata-tag-list-item"),
      }),
    }),
  });
  const Action = Object.assign(mockComponent("raycast-action"), {
    OpenInBrowser: mockComponent("raycast-action-open-in-browser"),
    Push: mockComponent("raycast-action-push"),
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
    Cache: class {
      get() {
        return undefined;
      }
      set() {}
    },
    Color: {
      Blue: "blue",
      Green: "green",
      Purple: "purple",
      Red: "red",
      SecondaryText: "secondary",
      Yellow: "yellow",
    },
    Detail,
    Form,
    Icon: new Proxy({}, { get: (_target, property) => String(property) }),
    Keyboard: { Shortcut: { Common: { Refresh: { modifiers: ["cmd"], key: "r" } } } },
    List,
    openExtensionPreferences: vi.fn(),
    confirmAlert: vi.fn(),
    showToast: vi.fn(),
    Toast: { Style: { Animated: "animated", Failure: "failure", Success: "success" } },
    useNavigation: () => ({ pop: vi.fn() }),
  };
});

const tasks = taskListFixture as GroundcrewTask[];
const taskDetail = taskDetailFixture as GroundcrewTask;

const lifecycleInventory: GroundcrewStatusInventory = {
  schemaVersion: 1,
  localCapturedAt: "2026-08-20T09:00:00.000Z",
  remote: {
    capturedAt: "2026-08-20T09:00:01.000Z",
    lastAttemptAt: "2026-08-20T09:00:01.000Z",
    lastAttemptStatus: "ok",
  },
  maximumInProgress: 3,
  workspaceProbe: { status: "ok" },
  orphanedSessions: [],
  tasks: [
    {
      task: "run-42",
      lifecycle: "running",
      flags: [],
      session: "live",
      worktrees: [],
      recentLogLines: [],
      source: {
        id: "queue:RUN-42",
        naturalId: "run-42",
        title: "Run active implementation",
        status: "in-progress",
      },
    },
    {
      task: "rev-7",
      lifecycle: "interrupted",
      flags: [],
      session: "not-live",
      worktrees: [
        {
          repository: "groundcrew-raycast",
          kind: "host",
          dir: "/work/rev-7",
          branch: "review-rev-7",
          git: { kind: "clean" },
          pullRequests: [],
        },
      ],
      recentLogLines: [],
      source: {
        id: "tracker:REV-7",
        naturalId: "rev-7",
        title: "Review task browser",
        status: "in-review",
      },
    },
  ],
  inProgressWithoutWorktree: [],
  queueReady: [
    {
      id: "tracker:TEM-3895",
      naturalId: "tem-3895",
      title: "Build the Groundcrew task browser",
      repository: "ClipboardHealth/groundcrew-raycast",
      agent: "codex",
    },
  ],
  queueBlocked: [],
  slots: { used: 1, maximum: 3 },
};

function lifecycleMutations(overrides: Partial<LifecycleMutations> = {}): LifecycleMutations {
  const success = async () => ({
    kind: "success" as const,
    exitCode: 0 as const,
    stdout: "",
    stderr: "",
  });
  return {
    startTask: success,
    stopTask: success,
    resumeTask: success,
    cleanupTask: success,
    completeTask: success,
    ...overrides,
  };
}

const defaultLifecycleProps = {
  loadStatus: async () => lifecycleInventory,
  mutations: lifecycleMutations(),
};

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

describe("TaskBrowser", () => {
  it("offers lifecycle actions and reconciles through full task and status refreshes", async () => {
    vi.mocked(showToast).mockResolvedValue({} as never);
    const loadTasks = vi.fn(async () => tasks);
    const loadStatus = vi.fn(async () => lifecycleInventory);
    const startTask = vi.fn<LifecycleMutations["startTask"]>().mockResolvedValue({
      kind: "success",
      exitCode: 0,
      stdout: "",
      stderr: "",
    });
    const renderer = await render(
      <TaskBrowser
        loadTasks={loadTasks}
        loadTask={async () => taskDetail}
        loadStatus={loadStatus}
        mutations={lifecycleMutations({ startTask })}
      />,
    );

    const ready = findByType(renderer, "raycast-list-item").find((item) => item.props.id === "tracker:TEM-3895");
    expect(
      ready?.findAll((node) => (node.type as string) === "raycast-action").map((action) => action.props.title),
    ).toContain("Start Task");
    const active = findByType(renderer, "raycast-list-item").find((item) => item.props.id === "queue:RUN-42");
    expect(
      active
        ?.findAll((node) => ["raycast-action", "raycast-action-push"].includes(node.type as string))
        .map((action) => action.props.title),
    ).toContain("Stop & Clean up Task");
    const preserved = findByType(renderer, "raycast-list-item").find((item) => item.props.id === "tracker:REV-7");
    expect(
      preserved?.findAll((node) => (node.type as string) === "raycast-action").map((action) => action.props.title),
    ).toEqual(expect.arrayContaining(["Resume Task", "Cleanup Task"]));

    const start = ready
      ?.findAll((node) => (node.type as string) === "raycast-action")
      .find((action) => action.props.title === "Start Task");
    await act(async () => {
      await start?.props.onAction();
    });

    expect(startTask).toHaveBeenCalledWith(
      "tracker:TEM-3895",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(loadTasks).toHaveBeenCalledTimes(2);
    expect(loadStatus.mock.calls).toEqual([[], []]);
  });

  it("offers local lifecycle actions when degraded status omits an unambiguous source", async () => {
    const activeTask = lifecycleInventory.tasks[0];
    if (activeTask === undefined) {
      throw new Error("Expected an active fixture.");
    }
    const degradedInventory: GroundcrewStatusInventory = {
      ...lifecycleInventory,
      remote: {
        ...lifecycleInventory.remote,
        lastAttemptStatus: "unavailable",
        lastAttemptError: "provider unavailable",
      },
      tasks: [{ ...activeTask, source: undefined }],
      queueReady: [],
    };
    const renderer = await render(
      <TaskBrowser
        loadTasks={async () => tasks}
        loadTask={async () => taskDetail}
        loadStatus={async () => degradedInventory}
        mutations={lifecycleMutations()}
      />,
    );

    const active = findByType(renderer, "raycast-list-item").find((item) => item.props.id === "queue:RUN-42");
    expect(
      active
        ?.findAll((node) => ["raycast-action", "raycast-action-push"].includes(node.type as string))
        .map((action) => action.props.title),
    ).toContain("Stop & Clean up Task");
  });

  it("shows loading, then source-neutral grouped rows with search fields and canonical filters", async () => {
    let resolveTasks: ((value: GroundcrewTask[]) => void) | undefined;
    const loadTasks = vi.fn(
      () =>
        new Promise<GroundcrewTask[]>((resolve) => {
          resolveTasks = resolve;
        }),
    );
    const renderer = await render(
      <TaskBrowser {...defaultLifecycleProps} loadTasks={loadTasks} loadTask={async () => taskDetail} />,
    );

    expect(findByType(renderer, "raycast-list")[0]?.props.isLoading).toBe(true);
    expect(findByType(renderer, "raycast-list-empty-view")[0]?.props.title).toBe("Loading Groundcrew Tasks");

    await act(async () => {
      resolveTasks?.(tasks);
      await Promise.resolve();
    });

    expect(findByType(renderer, "raycast-list-section").map((section) => section.props.title)).toEqual([
      "Ready Todo",
      "Active",
      "In Review",
      "Blocked",
      "Completed",
      "Other",
    ]);
    const otherSection = findByType(renderer, "raycast-list-section").find(
      (section) => section.props.title === "Other",
    );
    expect(
      otherSection?.findAll((node) => (node.type as string) === "raycast-list-item").map((item) => item.props.id),
    ).toEqual(["archive:MISC-2", "archive:MISC-1"]);
    const readyTask = findByType(renderer, "raycast-list-item").find((item) => item.props.id === "tracker:TEM-3895");
    expect(readyTask?.props).toMatchObject({
      title: "Build the Groundcrew task browser",
      subtitle: "tracker:TEM-3895 · ClipboardHealth/groundcrew-raycast",
      keywords: expect.arrayContaining(["todo", "work-tracker", "codex"]),
      accessories: expect.arrayContaining([
        expect.objectContaining({ text: "codex" }),
        expect.objectContaining({ tag: expect.objectContaining({ value: "Todo" }) }),
      ]),
    });
    const blockedTask = findByType(renderer, "raycast-list-item").find((item) => item.props.id === "queue:BLOCKED-3");
    expect(blockedTask?.props.accessories).toEqual(
      expect.arrayContaining([expect.objectContaining({ text: expect.objectContaining({ value: "Blocked" }) })]),
    );

    const statusFilter = findByType(renderer, "raycast-list-dropdown")[0];
    await act(async () => statusFilter?.props.onChange("in-progress"));
    expect(findByType(renderer, "raycast-list-item").map((item) => item.props.id)).toEqual(["queue:RUN-42"]);
  });

  it("supports manual refresh and distinguishes empty, setup, command, and incompatible CLI states", async () => {
    const loadTasks = vi
      .fn<() => Promise<GroundcrewTask[]>>()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new GroundcrewClientError("COMMAND_FAILED", "crew task list --json exited with code 1."));
    const renderer = await render(
      <TaskBrowser {...defaultLifecycleProps} loadTasks={loadTasks} loadTask={async () => taskDetail} />,
    );

    expect(findByType(renderer, "raycast-list-empty-view")[0]?.props.title).toBe("No Groundcrew Tasks");
    const refresh = findByType(renderer, "raycast-action").find((action) => action.props.title === "Refresh Tasks");
    await act(async () => {
      await refresh?.props.onAction();
    });
    expect(loadTasks).toHaveBeenCalledTimes(2);
    expect(findByType(renderer, "raycast-list-empty-view")[0]?.props).toMatchObject({
      title: "Couldn’t Load Groundcrew Tasks",
      description: "crew task list --json exited with code 1.",
    });

    const setupRenderer = await render(
      <TaskBrowser
        {...defaultLifecycleProps}
        loadTasks={async () => {
          throw new GroundcrewClientError(
            "EXECUTABLE_NOT_FOUND",
            "Set the absolute Groundcrew Executable Path preference.",
          );
        }}
        loadTask={async () => taskDetail}
      />,
    );
    expect(findByType(setupRenderer, "raycast-list-empty-view")[0]?.props.title).toBe("Groundcrew Setup Required");

    const incompatibleRenderer = await render(
      <TaskBrowser
        {...defaultLifecycleProps}
        loadTasks={async () => {
          throw new GroundcrewClientError("INCOMPATIBLE_VERSION", "Upgrade Groundcrew and try again.");
        }}
        loadTask={async () => taskDetail}
      />,
    );
    expect(findByType(incompatibleRenderer, "raycast-list-empty-view")[0]?.props).toMatchObject({
      title: "Groundcrew CLI Is Incompatible",
      description: "Upgrade Groundcrew and try again.",
    });
  });

  it("ignores a stale refresh failure after a newer refresh succeeds", async () => {
    let rejectStale: ((error: Error) => void) | undefined;
    let resolveCurrent: ((value: GroundcrewTask[]) => void) | undefined;
    const loadTasks = vi
      .fn<() => Promise<GroundcrewTask[]>>()
      .mockResolvedValueOnce(tasks)
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectStale = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCurrent = resolve;
          }),
      );
    const renderer = await render(
      <TaskBrowser {...defaultLifecycleProps} loadTasks={loadTasks} loadTask={async () => taskDetail} />,
    );
    const refresh = findByType(renderer, "raycast-action").find((action) => action.props.title === "Refresh Tasks");

    let staleRefresh: Promise<void> | undefined;
    await act(async () => {
      staleRefresh = refresh?.props.onAction();
      await Promise.resolve();
    });
    await act(async () => {
      const currentRefresh = refresh?.props.onAction();
      resolveCurrent?.(tasks);
      await currentRefresh;
    });
    await act(async () => {
      rejectStale?.(new Error("obsolete failure"));
      await staleRefresh;
    });

    expect(showToast).not.toHaveBeenCalled();
  });
});

describe("TaskDetail", () => {
  it("loads canonical detail fields and exposes Open Task only when the CLI supplies a URL", async () => {
    const loadTask = vi.fn(async () => taskDetail);
    const renderer = await render(<TaskDetail task={tasks[0]!} loadTask={loadTask} />);

    expect(loadTask).toHaveBeenCalledWith("tracker:TEM-3895");
    const detail = findByType(renderer, "raycast-detail")[0];
    expect(detail?.props.markdown).toContain(taskDetail.description);
    expect(detail?.props.markdown).toContain("Publish shared contract");
    expect(findByType(renderer, "raycast-detail-metadata-label").map((item) => item.props.title)).toEqual(
      expect.arrayContaining(["Task ID", "Status", "Source", "Repository", "Blockers", "Priority"]),
    );
    expect(findByType(renderer, "raycast-detail-metadata-link")[0]?.props).toMatchObject({
      title: "Task URL",
      target: taskDetail.url,
    });
    expect(findByType(renderer, "raycast-action-open-in-browser")[0]?.props).toMatchObject({
      title: "Open Task",
      url: taskDetail.url,
    });

    const withoutUrl = { ...taskDetail, url: "   " };
    const withoutUrlRenderer = await render(<TaskDetail task={withoutUrl} loadTask={async () => withoutUrl} />);
    expect(findByType(withoutUrlRenderer, "raycast-action-open-in-browser")).toHaveLength(0);
    expect(findByType(withoutUrlRenderer, "raycast-detail-metadata-link")).toHaveLength(0);
  });
});
