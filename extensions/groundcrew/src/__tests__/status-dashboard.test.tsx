import { createElement, type ReactElement, type ReactNode } from "react";
import { confirmAlert, showToast } from "@raycast/api";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { GroundcrewClientError } from "../cli";
import { StatusDashboard, StatusTaskDetail } from "../components/status-dashboard";
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

  const List = Object.assign(mockComponent("raycast-list", ["actions"]), {
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
    CopyToClipboard: mockComponent("raycast-action-copy-to-clipboard"),
    Open: mockComponent("raycast-action-open"),
    OpenInBrowser: mockComponent("raycast-action-open-in-browser"),
    OpenWith: mockComponent("raycast-action-open-with"),
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
      Orange: "orange",
      Purple: "purple",
      Red: "red",
      SecondaryText: "secondary",
      Yellow: "yellow",
    },
    Detail,
    Form,
    Icon: new Proxy({}, { get: (_target, property) => String(property) }),
    Keyboard: {
      Shortcut: {
        Common: {
          Refresh: { modifiers: ["cmd"], key: "r" },
          RemoveAll: { modifiers: ["ctrl", "shift"], key: "x" },
        },
      },
    },
    List,
    openExtensionPreferences: vi.fn(),
    getPreferenceValues: () => ({}),
    closeMainWindow: vi.fn(),
    confirmAlert: vi.fn(),
    showToast: vi.fn(),
    Toast: { Style: { Animated: "animated", Failure: "failure", Success: "success" } },
    useNavigation: () => ({ pop: vi.fn() }),
  };
});

const inventory: GroundcrewStatusInventory = {
  schemaVersion: 1,
  localCapturedAt: "2026-08-20T08:30:00.000Z",
  remote: {
    capturedAt: "2026-08-20T07:00:00.000Z",
    lastAttemptAt: "2026-08-20T08:30:01.000Z",
    lastAttemptStatus: "unavailable",
    lastAttemptError: "Linear request timed out",
  },
  maximumInProgress: 3,
  workspaceProbe: { status: "unavailable", error: "workspace root is offline" },
  orphanedSessions: ["groundcrew-orphan"],
  tasks: [
    {
      task: "tem-3896",
      title: "Build status dashboard",
      url: "https://linear.app/clipboardhealth/issue/TEM-3896",
      agent: "codex",
      lifecycle: "running",
      flags: ["active"],
      startedAt: "2026-08-20T07:30:00.000Z",
      updatedAt: "2026-08-20T08:29:00.000Z",
      session: "live",
      attachCommand: "crew attach tem-3896",
      hint: "Review the latest output",
      worktrees: [
        {
          repository: "groundcrew-raycast",
          kind: "host",
          dir: "/work/groundcrew-raycast-tem-3896",
          branch: "shubhsherl-tem-3896",
          git: { kind: "dirty", modified: 2, untracked: 1 },
          pullRequests: [
            {
              url: "https://github.com/ClipboardHealth/groundcrew-raycast/pull/4",
              number: 4,
              state: "open",
              title: "Build status dashboard",
            },
          ],
        },
      ],
      recentLogLines: ["working"],
      source: {
        id: "linear:tem-3896",
        naturalId: "tem-3896",
        title: "Build status dashboard",
        url: "https://linear.app/clipboardhealth/issue/TEM-3896",
        repository: "ClipboardHealth/groundcrew-raycast",
        agent: "codex",
        status: "in-progress",
      },
    },
    {
      task: "tem-3900",
      title: "Resume preserved work",
      agent: "claude",
      lifecycle: "resumed",
      flags: [],
      startedAt: "2026-08-20T06:00:00.000Z",
      updatedAt: "2026-08-20T08:00:00.000Z",
      resumeCount: 2,
      session: "live",
      worktrees: [
        {
          repository: "groundcrew",
          kind: "host",
          dir: "/work/groundcrew-tem-3900",
          branch: "shubhsherl-tem-3900",
          git: { kind: "clean" },
          pullRequests: [],
        },
      ],
      recentLogLines: [],
    },
    {
      task: "tem-3901",
      title: "Interrupted work",
      agent: "antigravity",
      lifecycle: "interrupted",
      flags: [],
      updatedAt: "2026-08-20T07:45:00.000Z",
      reason: "Host restarted",
      session: "not-live",
      worktrees: [
        {
          repository: "groundcrew",
          kind: "host",
          dir: "/work/groundcrew-tem-3901",
          branch: "shubhsherl-tem-3901",
          git: { kind: "unknown" },
          pullRequests: [],
        },
      ],
      recentLogLines: [],
    },
    {
      task: "tem-3902",
      title: "Exited work",
      lifecycle: "idle",
      flags: [],
      updatedAt: "2026-08-20T07:15:00.000Z",
      session: "exited",
      worktrees: [
        {
          repository: "groundcrew",
          kind: "host",
          dir: "/work/groundcrew-tem-3902",
          branch: "shubhsherl-tem-3902",
          git: { kind: "clean" },
          pullRequests: [],
        },
      ],
      recentLogLines: [],
    },
    {
      task: "tem-3903",
      title: "Local task without workspace",
      lifecycle: "failed-to-launch",
      flags: [],
      updatedAt: "2026-08-20T07:10:00.000Z",
      detail: "Provisioning failed",
      session: "unknown",
      worktrees: [],
      recentLogLines: [],
    },
  ],
  inProgressWithoutWorktree: [
    {
      id: "linear:tem-3904",
      naturalId: "tem-3904",
      title: "Remote task without workspace",
      url: "https://linear.app/clipboardhealth/issue/TEM-3904",
      repository: "ClipboardHealth/groundcrew",
      agent: "copilot",
    },
  ],
  queueReady: [
    {
      id: "linear:tem-3905",
      naturalId: "tem-3905",
      title: "Ready task",
      repository: "ClipboardHealth/groundcrew",
      agent: "codex",
    },
  ],
  queueBlocked: [
    {
      id: "linear:tem-3906",
      naturalId: "tem-3906",
      title: "Blocked task",
      repository: "ClipboardHealth/groundcrew",
      agent: "codex",
      blockedBy: [
        {
          id: "linear:tem-3888",
          naturalId: "tem-3888",
          status: "in-progress",
          nativeStatus: "In Progress",
        },
      ],
    },
  ],
  slots: { used: 3, maximum: 3 },
};

const canonicalTasks: GroundcrewTask[] = [
  {
    id: "linear:tem-3905",
    source: "linear",
    title: "Ready task",
    description: "",
    status: "todo",
    repository: "ClipboardHealth/groundcrew",
    agent: "codex",
    assignee: "Shubham",
    updatedAt: "2026-08-20T08:30:00.000Z",
    blockers: [],
    hasMoreBlockers: false,
  },
];

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
  loadTasks: async () => canonicalTasks,
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

describe("StatusDashboard", () => {
  it("offers lifecycle actions and reconciles through full status and task refreshes", async () => {
    vi.mocked(showToast).mockResolvedValue({} as never);
    const loadStatus = vi.fn(async () => inventory);
    const loadTasks = vi.fn(async () => canonicalTasks);
    const startTask = vi.fn<LifecycleMutations["startTask"]>().mockResolvedValue({
      kind: "success",
      exitCode: 0,
      stdout: "",
      stderr: "",
    });
    const renderer = await render(
      <StatusDashboard loadStatus={loadStatus} loadTasks={loadTasks} mutations={lifecycleMutations({ startTask })} />,
    );

    const active = findByType(renderer, "raycast-list-item").find((item) => item.props.id === "local:linear:tem-3896");
    expect(
      active
        ?.findAll((node) => ["raycast-action", "raycast-action-push"].includes(node.type as string))
        .map((action) => action.props.title),
    ).toContain("Stop & Clean up Task");
    const preserved = findByType(renderer, "raycast-list-item").find((item) => item.props.id === "local:tem-3901");
    expect(
      preserved?.findAll((node) => (node.type as string) === "raycast-action").map((action) => action.props.title),
    ).toEqual(expect.arrayContaining(["Resume Task", "Cleanup Task"]));
    const ready = findByType(renderer, "raycast-list-item").find(
      (item) => item.props.id === "queue-ready:linear:tem-3905",
    );
    const start = ready
      ?.findAll((node) => (node.type as string) === "raycast-action")
      .find((action) => action.props.title === "Start Task");
    expect(start).toBeDefined();

    await act(async () => {
      await start?.props.onAction();
    });

    expect(startTask).toHaveBeenCalledWith(
      "linear:tem-3905",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(loadStatus.mock.calls).toEqual([[], []]);
    expect(loadTasks).toHaveBeenCalledTimes(2);
  });

  it("keeps same-natural-id provider rows and actions distinct", async () => {
    const linearReady = inventory.queueReady[0];
    if (linearReady === undefined) {
      throw new Error("Expected a ready fixture.");
    }
    const collidingInventory: GroundcrewStatusInventory = {
      ...inventory,
      tasks: [],
      inProgressWithoutWorktree: [],
      queueReady: [linearReady, { ...linearReady, id: "jira:tem-3905", title: "Jira task" }],
      queueBlocked: [],
      orphanedSessions: [],
    };
    const startTask = vi.fn<LifecycleMutations["startTask"]>().mockResolvedValue({
      kind: "success",
      exitCode: 0,
      stdout: "",
      stderr: "",
    });
    vi.mocked(showToast).mockResolvedValue({} as never);
    const renderer = await render(
      <StatusDashboard
        loadStatus={async () => collidingInventory}
        loadTasks={async () => []}
        mutations={lifecycleMutations({ startTask })}
      />,
    );

    const providerRows = findByType(renderer, "raycast-list-item").filter((item) =>
      String(item.props.id).startsWith("queue-ready:"),
    );
    expect(providerRows.map((item) => item.props.id)).toEqual([
      "queue-ready:linear:tem-3905",
      "queue-ready:jira:tem-3905",
    ]);
    const jiraStart = providerRows[1]
      ?.findAll((node) => (node.type as string) === "raycast-action")
      .find((action) => action.props.title === "Start Task");
    await act(async () => {
      await jiraStart?.props.onAction();
    });
    expect(startTask).toHaveBeenCalledWith(
      "jira:tem-3905",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("shows loading and then orders active and preserved workspaces before queue and degraded health", async () => {
    let resolveStatus: ((value: GroundcrewStatusInventory) => void) | undefined;
    const loadStatus = vi.fn(
      () =>
        new Promise<GroundcrewStatusInventory>((resolve) => {
          resolveStatus = resolve;
        }),
    );
    const renderer = await render(<StatusDashboard {...defaultLifecycleProps} loadStatus={loadStatus} />);

    expect(findByType(renderer, "raycast-list")[0]?.props.isLoading).toBe(true);
    expect(findByType(renderer, "raycast-list-empty-view")[0]?.props.title).toBe("Loading Groundcrew Status");

    await act(async () => {
      resolveStatus?.(inventory);
      await Promise.resolve();
    });

    expect(findByType(renderer, "raycast-list-section").map((section) => section.props.title)).toEqual([
      "Active Workspaces",
      "Preserved Workspaces",
      "Missing Workspaces",
      "Queue & Slot Health",
      "Degraded Probes",
    ]);
    expect(findByType(renderer, "raycast-list-item").map((item) => item.props.id)).toEqual([
      "local:linear:tem-3896",
      "local:tem-3900",
      "local:tem-3901",
      "local:tem-3902",
      "local:tem-3903",
      "remote-missing:linear:tem-3904",
      "slot-health",
      "queue-ready:linear:tem-3905",
      "queue-blocked:linear:tem-3906",
      "remote-health",
      "workspace-probe",
      "orphaned-sessions",
    ]);
    const activeTask = findByType(renderer, "raycast-list-item").find(
      (item) => item.props.id === "local:linear:tem-3896",
    );
    expect(
      activeTask
        ?.findAll((node) => ["raycast-action", "raycast-action-push"].includes(node.type as string))
        .map((action) => action.props.title),
    ).toEqual(expect.arrayContaining(["Stop & Clean up Task", "Show Task Details"]));
    expect(
      activeTask
        ?.findAll((node) => (node.type as string) === "raycast-action-open-in-browser")
        .map((action) => action.props.url),
    ).toEqual([
      "https://linear.app/clipboardhealth/issue/TEM-3896",
      "https://github.com/ClipboardHealth/groundcrew-raycast/pull/4",
    ]);
    expect(
      activeTask
        ?.findAll((node) => (node.type as string) === "raycast-action-open")
        .find((action) => action.props.application === "Finder")?.props,
    ).toMatchObject({
      target: "/work/groundcrew-raycast-tem-3896",
      application: "Finder",
    });
    const missingLocalTask = findByType(renderer, "raycast-list-item").find(
      (item) => item.props.id === "local:tem-3903",
    );
    expect(
      missingLocalTask?.findAll((node) => (node.type as string) === "raycast-action-open-in-browser"),
    ).toHaveLength(0);
    expect(missingLocalTask?.findAll((node) => (node.type as string) === "raycast-action-open")).toHaveLength(0);

    const slotHealth = findByType(renderer, "raycast-list-item").find((item) => item.props.id === "slot-health");
    expect(slotHealth?.props.subtitle).toContain("local captured 2026-08-20T08:30:00.000Z");
    expect(slotHealth?.props.subtitle).toContain("remote attempt unavailable at 2026-08-20T08:30:01.000Z");
    expect(slotHealth?.props.subtitle).toContain("retained payload captured 2026-08-20T07:00:00.000Z");
    const lifecycleByTask = Object.fromEntries(
      findByType(renderer, "raycast-list-item")
        .filter((item) => String(item.props.id).startsWith("local:"))
        .map((item) => [
          item.props.id,
          item.props.accessories.find((accessory: { tag?: { value: string } }) => accessory.tag)?.tag.value,
        ]),
    );
    expect(lifecycleByTask).toMatchObject({
      "local:linear:tem-3896": "Running",
      "local:tem-3900": "Resumed",
      "local:tem-3901": "Interrupted",
      "local:tem-3902": "Exited",
      "local:tem-3903": "Missing Workspace",
    });
  });

  it("uses a state-aware primary action: cmux for live, resume for preserved", async () => {
    const loadStatus = vi.fn(async () => inventory);
    const renderer = await render(<StatusDashboard {...defaultLifecycleProps} loadStatus={loadStatus} />);
    await act(async () => {
      await Promise.resolve();
    });

    const firstActionTitle = (id: string) => {
      const item = findByType(renderer, "raycast-list-item").find((i) => i.props.id === id);
      return item?.findAll((node) => ["raycast-action", "raycast-action-push"].includes(node.type as string))[0]?.props
        .title;
    };

    // Live/active task leads with Open in Cmux; interrupted (preserved) leads with Resume.
    expect(firstActionTitle("local:linear:tem-3896")).toBe("Open in Cmux");
    expect(firstActionTitle("local:tem-3901")).toBe("Resume Task");
  });

  it("offers bulk idle cleanup (normal and force) on preserved rows but not active ones", async () => {
    vi.mocked(confirmAlert).mockResolvedValue(true);
    vi.mocked(showToast).mockResolvedValue({
      style: "",
      title: "",
      message: undefined,
    } as never);
    const cleanupAllTasks = vi.fn(async () => ({
      kind: "success" as const,
      exitCode: 0 as const,
      stdout: "✓ Cleanup complete for tem-3901 (host)",
      stderr: "",
    }));
    const loadStatus = vi.fn(async () => inventory);
    const renderer = await render(
      <StatusDashboard {...defaultLifecycleProps} loadStatus={loadStatus} cleanupAllTasks={cleanupAllTasks} />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    const actionTitles = (id: string) =>
      findByType(renderer, "raycast-list-item")
        .find((item) => item.props.id === id)
        ?.findAll((node) => (node.type as string) === "raycast-action")
        .map((action) => action.props.title) ?? [];

    expect(actionTitles("local:tem-3901")).toEqual(
      expect.arrayContaining(["Clean up All Idle Workspaces", "Clean up All Idle Workspaces (Force)"]),
    );
    expect(actionTitles("local:linear:tem-3896")).not.toContain("Clean up All Idle Workspaces");

    const preservedActions = findByType(renderer, "raycast-list-item")
      .find((item) => item.props.id === "local:tem-3901")
      ?.findAll((node) => (node.type as string) === "raycast-action");
    const normal = preservedActions?.find((action) => action.props.title === "Clean up All Idle Workspaces");
    const force = preservedActions?.find((action) => action.props.title === "Clean up All Idle Workspaces (Force)");

    await act(async () => {
      await normal?.props.onAction();
    });
    expect(cleanupAllTasks).toHaveBeenLastCalledWith(undefined);

    await act(async () => {
      await force?.props.onAction();
    });
    expect(cleanupAllTasks).toHaveBeenLastCalledWith({ force: true });
    expect(confirmAlert).toHaveBeenCalledTimes(2);
  });

  it("filters task detail from the joined inventory and exposes only supplied native resources", async () => {
    const renderer = await render(<StatusTaskDetail inventory={inventory} naturalTaskId="TEM-3896" />);

    const metadata = Object.fromEntries(
      findByType(renderer, "raycast-detail-metadata-label").map((label) => [label.props.title, label.props.text]),
    );
    expect(metadata).toMatchObject({
      "Task ID": "tem-3896",
      Lifecycle: "Running",
      Session: "Live",
      Agent: "codex",
      "Source Status": "In Progress",
      Repository: "ClipboardHealth/groundcrew-raycast",
      Branch: "shubhsherl-tem-3896",
      "Worktree Dirtiness": "Dirty · 2 modified · 1 untracked",
      "Blockers / Eligibility": "Active local workspace",
      Workspace: "Available · 1 worktree",
      "Pull Requests": "#4 · open · Build status dashboard",
    });
    expect(findByType(renderer, "raycast-detail")[0]?.props.markdown).toContain("Review the latest output");
    expect(findByType(renderer, "raycast-action-open-in-browser").map((action) => action.props.url)).toEqual([
      "https://linear.app/clipboardhealth/issue/TEM-3896",
      "https://github.com/ClipboardHealth/groundcrew-raycast/pull/4",
    ]);
    expect(
      findByType(renderer, "raycast-action-open").find((action) => action.props.application === "Finder")?.props,
    ).toMatchObject({
      title: "Open Worktree in Finder",
      target: "/work/groundcrew-raycast-tem-3896",
      application: "Finder",
    });

    const ambiguousPullRequestRenderer = await render(
      <StatusTaskDetail inventory={inventory} naturalTaskId="tem-3900" />,
    );
    expect(findByType(ambiguousPullRequestRenderer, "raycast-detail")[0]?.props.markdown).toContain(
      "No pull request was returned. The legacy status cannot distinguish no PR from a failed GitHub lookup.",
    );
    expect(findByType(ambiguousPullRequestRenderer, "raycast-action-open-in-browser")).toHaveLength(0);
    expect(findByType(ambiguousPullRequestRenderer, "raycast-action-open")).toHaveLength(1);

    const missingWorkspaceRenderer = await render(<StatusTaskDetail inventory={inventory} naturalTaskId="tem-3904" />);
    expect(findByType(missingWorkspaceRenderer, "raycast-action-open")).toHaveLength(0);
    expect(findByType(missingWorkspaceRenderer, "raycast-action-open-in-browser")).toHaveLength(1);

    const blockedRenderer = await render(<StatusTaskDetail inventory={inventory} naturalTaskId="tem-3906" />);
    const blockedEligibility = findByType(blockedRenderer, "raycast-detail-metadata-label").find(
      (label) => label.props.title === "Blockers / Eligibility",
    );
    expect(blockedEligibility?.props.text).toBe("Blocked by tem-3888");
    expect(findByType(blockedRenderer, "raycast-action-open-in-browser")).toHaveLength(0);
    expect(findByType(blockedRenderer, "raycast-action-open")).toHaveLength(0);

    const preservedRenderer = await render(<StatusTaskDetail inventory={inventory} naturalTaskId="tem-3901" />);
    const preservedEligibility = findByType(preservedRenderer, "raycast-detail-metadata-label").find(
      (label) => label.props.title === "Blockers / Eligibility",
    );
    expect(preservedEligibility?.props.text).toBe("Preserved local workspace");

    const mixedPullRequestInventory = structuredClone(inventory);
    mixedPullRequestInventory.tasks[0]?.worktrees.push({
      repository: "groundcrew-cli",
      kind: "host",
      dir: "/work/groundcrew-cli-tem-3896",
      branch: "shubhsherl-tem-3896",
      git: { kind: "clean" },
      pullRequests: [],
    });
    const mixedPullRequestRenderer = await render(
      <StatusTaskDetail inventory={mixedPullRequestInventory} naturalTaskId="tem-3896" />,
    );
    expect(findByType(mixedPullRequestRenderer, "raycast-detail")[0]?.props.markdown).toContain(
      "groundcrew-cli (shubhsherl-tem-3896): No pull request was returned.",
    );
    expect(
      findByType(mixedPullRequestRenderer, "raycast-action-open-in-browser").map((action) => action.props.url),
    ).toEqual([
      "https://linear.app/clipboardhealth/issue/TEM-3896",
      "https://github.com/ClipboardHealth/groundcrew-raycast/pull/4",
    ]);
  });

  it("implements empty, refresh-error, unavailable-remote, and incompatible-contract states", async () => {
    const emptyInventory: GroundcrewStatusInventory = {
      ...inventory,
      remote: {
        capturedAt: "2026-08-20T08:30:00.000Z",
        lastAttemptAt: "2026-08-20T08:30:01.000Z",
        lastAttemptStatus: "ok",
      },
      workspaceProbe: { status: "ok" },
      orphanedSessions: [],
      tasks: [],
      inProgressWithoutWorktree: [],
      queueReady: [],
      queueBlocked: [],
      slots: { used: 0, maximum: 3 },
    };
    const loadStatus = vi
      .fn<() => Promise<GroundcrewStatusInventory>>()
      .mockResolvedValueOnce(emptyInventory)
      .mockRejectedValueOnce(new Error("temporary status failure"));
    const renderer = await render(<StatusDashboard {...defaultLifecycleProps} loadStatus={loadStatus} />);

    expect(findByType(renderer, "raycast-list-empty-view")[0]?.props).toMatchObject({
      title: "No Groundcrew Work",
      description: expect.stringContaining("0 of 3 slots used"),
    });
    const refresh = findByType(renderer, "raycast-action").find((action) => action.props.title === "Refresh Status");
    await act(async () => {
      await refresh?.props.onAction();
    });
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Couldn’t Refresh Groundcrew Status",
        message: "temporary status failure",
      }),
    );
    expect(findByType(renderer, "raycast-list-empty-view")[0]?.props.title).toBe("No Groundcrew Work");

    const unavailableRemoteRenderer = await render(
      <StatusDashboard
        {...defaultLifecycleProps}
        loadStatus={async () => ({
          ...emptyInventory,
          remote: {
            lastAttemptAt: "2026-08-20T08:31:00.000Z",
            lastAttemptStatus: "unavailable",
            lastAttemptError: "Remote source unavailable",
          },
          workspaceProbe: { status: "unavailable", error: "Workspace source unavailable" },
          slots: undefined,
        })}
      />,
    );
    const remoteHealth = findByType(unavailableRemoteRenderer, "raycast-list-item").find(
      (item) => item.props.id === "remote-health",
    );
    expect(remoteHealth?.props.accessories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: expect.objectContaining({ value: "No Remote Payload" }) }),
      ]),
    );
    expect(
      remoteHealth
        ?.findAll((node) => (node.type as string) === "raycast-action")
        .some((action) => action.props.title === "Refresh Status"),
    ).toBe(true);
    const workspaceProbe = findByType(unavailableRemoteRenderer, "raycast-list-item").find(
      (item) => item.props.id === "workspace-probe",
    );
    expect(
      workspaceProbe
        ?.findAll((node) => (node.type as string) === "raycast-action")
        .some((action) => action.props.title === "Refresh Status"),
    ).toBe(true);

    const incompatibleRenderer = await render(
      <StatusDashboard
        {...defaultLifecycleProps}
        loadStatus={async () => {
          throw new GroundcrewClientError("STATUS_SCHEMA_MISMATCH", "Groundcrew status schema 2 is incompatible.");
        }}
      />,
    );
    expect(findByType(incompatibleRenderer, "raycast-list-empty-view")[0]?.props).toMatchObject({
      title: "Groundcrew CLI Is Incompatible",
      description: "Groundcrew status schema 2 is incompatible.",
    });
  });
});
