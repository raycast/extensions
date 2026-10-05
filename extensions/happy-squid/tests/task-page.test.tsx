import type { ComponentProps, ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  confirmAlert,
  environment,
  launchCommand,
  LaunchType,
  LocalStorage,
  pop,
  push,
  updateCommandMetadata,
} from "./raycast-api";
import type { TaskSnapshot } from "../src/vendor/task-control";
import Tasks from "../src/manage-tasks";
import TaskLauncher from "../src/tasks";
import { TaskProvider, useAccount, useTasks } from "../src/task-state";
import { TaskForm } from "../src/components/task-form";
import { taskTimes, taskSubtitle } from "../src/format";
import manifest from "../package.json";
import { BROWSER_SETTINGS_URL } from "../src/vendor/browser-settings";

// Page/state tests render the conversation directly; task-review-flow.test.tsx
// exercises the real native editor/chat stack.
vi.mock("../src/components/task-review-flow", async () => ({
  TaskReviewFlow: (await import("../src/components/task-review")).TaskReview,
}));

const h = vi.hoisted(() => ({
  request: vi.fn(),
  signOut: vi.fn(),
  userId: "user-1",
  channel: vi.fn(),
  removeChannel: vi.fn(),
  progress: (_event: { payload: unknown }) => {},
}));
vi.mock("../src/client", () => ({
  requestTasks: h.request,
  RAYCAST_SUPABASE_URL: "https://task-test.invalid",
  createTaskClient: () => ({
    channel: h.channel,
    removeChannel: h.removeChannel,
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getSession: async () => ({ data: { session: { user: { id: h.userId } } } }),
      signOut: h.signOut,
      stopAutoRefresh() {},
    },
  }),
}));

const idle: TaskSnapshot = {
  deviceId: "device-1",
  capturedAt: 1_700_000_000_000,
  task: null,
  review: null,
  recentTasks: [],
  durationChoices: [5, 15, 30, 45, 60, 120],
  defaultDurationMinutes: 5,
  customDurationAllowed: true,
  maxDurationMinutes: 1440,
  descriptionLimit: 2000,
  canStart: true,
  weekSpent: false,
};
const running: TaskSnapshot = {
  ...idle,
  canStart: false,
  task: {
    id: "task-1",
    description: "Write launch notes",
    context: "",
    source: null,
    sourceUrl: null,
    startedAt: idle.capturedAt,
    elapsedMs: 60_000,
    remainingMs: 29 * 60_000,
    paused: false,
    openEnded: false,
    locked: false,
    lockEndsAt: null,
    canLock: true,
  },
};
const rejected: TaskSnapshot = {
  ...idle,
  review: {
    id: "review-1",
    description: "Research launch videos",
    kind: "start",
    status: "unproductive",
    durationMinutes: 30,
    chat: [{ role: "assistant", content: "Explain how this helps." }],
  },
};
let tree: ReactTestRenderer;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  environment.launchType = LaunchType.UserInitiated;
  h.userId = "user-1";
  h.channel.mockImplementation(() => ({
    on(_type: string, _filter: unknown, callback: typeof h.progress) {
      h.progress = callback;
      return this;
    },
    subscribe() {
      return this;
    },
  }));
  h.removeChannel.mockResolvedValue("ok");
  h.signOut.mockResolvedValue({ error: null });
  LocalStorage.getItem.mockReset().mockResolvedValue(undefined);
  LocalStorage.setItem.mockReset().mockResolvedValue(undefined);
  LocalStorage.removeItem.mockReset().mockResolvedValue(undefined);
  h.request.mockResolvedValue({ ok: true, snapshot: idle });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function render(node: ReactElement) {
  await act(async () => {
    tree = create(node);
  });
}
function reply() {
  return [...nodes("Form.TextField"), ...nodes("Form.TextArea")].find((node) => node.props.title === "Reply")!;
}
function nodes(type: string) {
  return tree.root.findAll((node) => node.type === (type as unknown));
}
async function form(displayed: TaskSnapshot, purpose: ComponentProps<typeof TaskForm>["purpose"] = "start") {
  function Harness() {
    const account = useAccount();
    return (
      <TaskProvider account={account}>
        <TaskForm purpose={purpose} displayed={displayed} />
      </TaskProvider>
    );
  }
  await render(<Harness />);
}

test("Happy Squid refreshes in the background and its task page requests snapshots only", async () => {
  expect(manifest.commands).toEqual([
    expect.objectContaining({ name: "tasks", title: "Current Task", mode: "no-view", interval: "1m" }),
    expect.objectContaining({ name: "manage-tasks", mode: "view" }),
  ]);
  expect(manifest.commands[0]).not.toHaveProperty("arguments");
  await render(<Tasks />);
  expect(nodes("List.Item").map((node) => node.props.title)).toContain("New Task");
  expect(launchCommand).toHaveBeenLastCalledWith({
    name: "tasks",
    type: LaunchType.Background,
    context: { subtitle: "Start a task" },
  });
  expect(h.request.mock.calls.every((call) => call[1].action.kind === "snapshot")).toBe(true);
});

test("common actions open Happy Squid Settings through the default browser", async () => {
  await render(<Tasks />);
  const links = nodes("Action.OpenInBrowser");
  expect(links.find((node) => node.props.title === "Open Happy Squid Settings")!.props.url).toBe(BROWSER_SETTINGS_URL);
  expect(links.some((node) => node.props.title === "Open Happy Squid Website")).toBe(false);
});

test("reopening with a running task shows its details and changes only the subtitle", async () => {
  h.request.mockResolvedValue({ ok: true, snapshot: running });
  await render(<Tasks />);
  expect(nodes("Detail")[0].props.markdown).toContain("Write launch notes");
  expect(h.request).toHaveBeenCalledTimes(1);
  expect(h.request.mock.calls[0][1].action).toEqual({ kind: "snapshot" });
  expect(launchCommand).toHaveBeenLastCalledWith({
    name: "tasks",
    type: LaunchType.Background,
    context: { subtitle: "29m left · Write launch notes" },
  });
});

test("a pending review takes priority over the running task", async () => {
  h.request.mockResolvedValue({
    ok: true,
    snapshot: {
      ...running,
      review: {
        id: "review-1",
        description: "New wording",
        kind: "edit",
        status: "unproductive",
        durationMinutes: 30,
        chat: [{ role: "assistant", content: "Explain how this helps." }],
      },
    },
  });
  await render(<Tasks />);
  expect(nodes("Form")[0].props.navigationTitle).toBe("Happy Squid");
  expect(nodes("Form.Description").some((node) => node.props.text === "Explain how this helps.")).toBe(true);
  expect(reply().props.placeholder).toBe("Message Happy Squid");
});

test("the new task form performs nothing until an explicit, valid submit", async () => {
  await form(idle);
  await act(async () => {
    await nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  expect(h.request.mock.calls.every((call) => call[1].action.kind === "snapshot")).toBe(true);
  expect(nodes("Form.TextArea")).toHaveLength(1);
  expect(nodes("Form.TextArea")[0].props.error).toBe("Enter your task description");
  await act(async () => {
    nodes("Form.TextArea")[0].props.onChange("Write launch notes");
  });
  h.request.mockResolvedValue({ ok: true, snapshot: running });
  await act(async () => {
    await nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  expect(h.request).toHaveBeenLastCalledWith(expect.anything(), {
    action: { kind: "start", description: "Write launch notes", durationMinutes: 5 },
    expectedTaskId: null,
    expectedReviewId: null,
  });
  expect(pop).toHaveBeenCalledTimes(1);
});

test("paused timing stays frozen and open-ended tasks have no countdown", () => {
  const paused = { ...running, task: { ...running.task!, paused: true } };
  expect(taskTimes(paused, paused.capturedAt + 600_000)).toEqual({ remaining: 29 * 60_000, elapsed: 60_000 });
  expect(taskSubtitle(paused, paused.capturedAt)).toBe("Paused · Write launch notes");
  expect(
    taskSubtitle({ ...running, task: { ...running.task!, remainingMs: null, openEnded: true } }, running.capturedAt),
  ).toBe("Running · Write launch notes");
});

test("a timed task offers Stop without Complete and cancels the confirmation without acting", async () => {
  h.request.mockResolvedValue({ ok: true, snapshot: running });
  await render(<Tasks />);
  expect(nodes("Action").map((node) => node.props.title)).not.toContain("Complete Task");
  confirmAlert.mockResolvedValueOnce(false);
  await act(async () => {
    await nodes("Action")
      .find((node) => node.props.title === "Stop Task")!
      .props.onAction();
  });
  expect(confirmAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Stop your task?" }));
  expect(h.request.mock.calls.every((call) => call[1].action.kind === "snapshot")).toBe(true);
});

test("completing a source task confirms its source effect and targets the displayed task", async () => {
  h.request.mockResolvedValue({
    ok: true,
    snapshot: { ...running, task: { ...running.task!, source: "todoist", openEnded: true, remainingMs: null } },
  });
  await render(<Tasks />);
  await act(async () => {
    await nodes("Action")
      .find((node) => node.props.title === "Complete Task")!
      .props.onAction();
  });
  expect(confirmAlert).toHaveBeenCalledWith(
    expect.objectContaining({ message: "Completing this task will mark it completed in Todoist." }),
  );
  expect(h.request).toHaveBeenLastCalledWith(expect.anything(), {
    action: { kind: "complete" },
    expectedTaskId: "task-1",
    expectedReviewId: null,
  });
});

test("an uncertain response keeps the draft and does not report success", async () => {
  await form(idle);
  await act(async () => {
    nodes("Form.TextArea")[0].props.onChange("Keep this draft");
  });
  h.request.mockRejectedValue(new Error("Could not confirm that action."));
  await act(async () => {
    await nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  expect(nodes("Form.TextArea")[0].props.value).toBe("Keep this draft");
  expect(nodes("Form.Description").some((node) => node.props.text === "Could not confirm that action.")).toBe(true);
  expect(pop).not.toHaveBeenCalled();
});

test("a native pushed form keeps live state when Raycast mounts it outside the root provider", async () => {
  await render(<Tasks />);
  const target = nodes("Action.Push").find((node) => node.props.title === "New Task")!.props.target;
  let pushed!: ReactTestRenderer;
  await act(async () => {
    pushed = create(target);
  });
  const inPushed = (type: string) => pushed.root.findAll((node) => node.type === (type as unknown));
  try {
    await act(async () => {
      inPushed("Form.TextArea")[0].props.onChange("Written in a pushed form");
    });
    h.request.mockRejectedValue(new Error("The task review has changed."));
    await act(async () => {
      await inPushed("Action.SubmitForm")[0].props.onSubmit();
    });
    expect(h.request).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: "start", description: "Written in a pushed form", durationMinutes: 5 },
      }),
    );
    expect(inPushed("Form.Description").some((node) => node.props.text === "The task review has changed.")).toBe(true);
    expect(inPushed("Form.TextArea")[0].props.value).toBe("Written in a pushed form");
    expect(pop).not.toHaveBeenCalled();
  } finally {
    await act(async () => pushed.unmount());
  }
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** Raycast warns, and may stop the command, when a page renders again without
 *  anything on it changing. A running task's page redrew on every clock tick
 *  and on every background read, although its minutes move about once a minute. */
test("a running task redraws only when a figure on screen moves", async () => {
  vi.useFakeTimers();
  const start = Date.now();
  // The backend restates the same task relative to each read's own capture time.
  h.request.mockImplementation(async () => {
    const ms = Date.now() - start;
    const task = running.task!;
    return {
      ok: true,
      snapshot: {
        ...running,
        capturedAt: running.capturedAt + ms,
        task: { ...task, elapsedMs: task.elapsedMs + ms, remainingMs: task.remainingMs! - ms },
      },
    };
  });
  let renders = 0;
  const shown: string[] = [];
  function Probe() {
    const { snapshot, now } = useTasks();
    renders++;
    if (snapshot?.task) shown.push(taskSubtitle(snapshot, now));
    return null;
  }
  function Harness() {
    const account = useAccount();
    return (
      <TaskProvider account={account}>
        <Probe />
      </TaskProvider>
    );
  }
  await render(<Harness />);
  await advance(1_000);
  const settled = renders;
  // One act() batches every update inside it, so the clock advances a second
  // at a time, as Raycast's own does.
  for (let second = 1; second < 26; second++) await advance(1_000);
  expect(h.request.mock.calls.length).toBeGreaterThan(5);
  expect(renders).toBe(settled);
  // Worked reaches 2m at 30 s and remaining falls to 28m at 31 s: two redraws.
  for (let second = 26; second < 36; second++) await advance(1_000);
  expect(renders - settled).toBe(2);
  expect(shown.at(-1)).toBe("28m left · Write launch notes");
});

test("the task screen leaves at its deadline and refreshes availability without sending a task action", async () => {
  vi.useFakeTimers();
  const read = deferred<{ ok: true; snapshot: TaskSnapshot }>();
  h.request.mockResolvedValueOnce({
    ok: true,
    snapshot: { ...running, task: { ...running.task!, remainingMs: 1_500, locked: true } },
  });
  h.request.mockReturnValue(read.promise);
  await render(<Tasks />);
  await advance(1_000);
  expect(nodes("Detail")[0].props.markdown).toContain("Write launch notes");
  expect(h.request).toHaveBeenCalledTimes(1);
  await advance(1_000);
  expect(nodes("Detail")).toHaveLength(0);
  expect(nodes("List.Item")[0].props.subtitle).toBeUndefined();
  expect(nodes("Action.Push")).toHaveLength(0);
  expect(h.request).toHaveBeenCalledTimes(2);
  expect(launchCommand).toHaveBeenLastCalledWith({
    name: "tasks",
    type: LaunchType.Background,
    context: { subtitle: "Start a task" },
  });
  const list = nodes("List")[0];
  await act(async () => read.resolve({ ok: true, snapshot: idle }));
  expect(nodes("List")[0]).toBe(list);
  expect(nodes("Action.Push").some((node) => node.props.title === "New Task")).toBe(true);
  expect(h.request.mock.calls.every((call) => call[1].action.kind === "snapshot")).toBe(true);
});

test("expiry removes the task screen while a background read is stuck, without overlapping requests", async () => {
  vi.useFakeTimers();
  const read = deferred<{ ok: true; snapshot: TaskSnapshot }>();
  h.request.mockResolvedValueOnce({
    ok: true,
    snapshot: { ...running, task: { ...running.task!, remainingMs: 4_000 } },
  });
  h.request.mockReturnValue(read.promise);
  await render(<Tasks />);
  await advance(3_000);
  expect(nodes("Detail")).toHaveLength(1);
  await advance(10_000);
  expect(nodes("Detail")).toHaveLength(0);
  expect(nodes("List")).toHaveLength(1);
  expect(h.request).toHaveBeenCalledTimes(2);
  await act(async () => read.resolve({ ok: true, snapshot: { ...running, task: { ...running.task!, paused: true } } }));
  expect(nodes("Detail")[0].props.markdown).toContain("Paused");
});

test.each(["pending", "failed"])(
  "an expired cached task never reopens its screen while the live read is %s",
  async (state) => {
    vi.useFakeTimers();
    LocalStorage.getItem.mockResolvedValue(
      JSON.stringify({
        snapshot: { ...running, task: { ...running.task!, remainingMs: 1_000 } },
        receivedAt: Date.now() - 2_000,
      }),
    );
    if (state === "pending") h.request.mockReturnValue(deferred<never>().promise);
    else h.request.mockRejectedValue(new Error("Could not connect to Happy Squid."));
    await render(<Tasks />);
    expect(nodes("Detail")).toHaveLength(0);
    expect(nodes("List")).toHaveLength(1);
    expect(nodes("List.Item").some((node) => node.props.subtitle === "Finish the current task to start another")).toBe(
      false,
    );
  },
);

test.each([
  { paused: true, openEnded: false, remainingMs: 0 },
  { paused: false, openEnded: true, remainingMs: null },
])("a task with %j stays open as time passes", async (task) => {
  vi.useFakeTimers();
  h.request.mockResolvedValueOnce({ ok: true, snapshot: { ...running, task: { ...running.task!, ...task } } });
  h.request.mockReturnValue(deferred<never>().promise);
  await render(<Tasks />);
  await advance(60_000);
  expect(nodes("Detail")[0].props.markdown).toContain("Write launch notes");
  expect(nodes("List")).toHaveLength(0);
});

test("an unanswered review leaves at the backend's deadline while a read is stuck, without sending a task action", async () => {
  vi.useFakeTimers();
  const read = deferred<{ ok: true; snapshot: TaskSnapshot }>();
  h.request.mockResolvedValueOnce({
    ok: true,
    snapshot: { ...rejected, canStart: false, review: { ...rejected.review!, expiresAt: rejected.capturedAt + 5_000 } },
  });
  h.request.mockReturnValue(read.promise);
  await render(<Tasks />);
  expect(reply().props.placeholder).toBe("Message Happy Squid");
  expect(launchCommand).toHaveBeenLastCalledWith({
    name: "tasks",
    type: LaunchType.Background,
    context: { subtitle: "Review task · Research launch videos" },
  });
  await advance(4_000);
  expect(nodes("Form")).toHaveLength(1);
  await advance(1_000);
  expect(nodes("Form")).toHaveLength(0);
  expect(nodes("List")).toHaveLength(1);
  expect(nodes("Action.Push")).toHaveLength(0);
  expect(h.request).toHaveBeenCalledTimes(2);
  expect(launchCommand).toHaveBeenLastCalledWith({
    name: "tasks",
    type: LaunchType.Background,
    context: { subtitle: "Start a task" },
  });
  await act(async () => read.resolve({ ok: true, snapshot: idle }));
  expect(nodes("Action.Push").some((node) => node.props.title === "New Task")).toBe(true);
  expect(h.request.mock.calls.every((call) => call[1].action.kind === "snapshot")).toBe(true);
});

test.each(["pending", "failed"])(
  "a cached review that lapsed while Raycast was closed never reopens while the live read is %s",
  async (state) => {
    vi.useFakeTimers();
    LocalStorage.getItem.mockResolvedValue(
      JSON.stringify({
        snapshot: {
          ...rejected,
          canStart: false,
          review: { ...rejected.review!, expiresAt: rejected.capturedAt + 1_000 },
        },
        receivedAt: Date.now() - 2_000,
      }),
    );
    if (state === "pending") h.request.mockReturnValue(deferred<never>().promise);
    else h.request.mockRejectedValue(new Error("Could not connect to Happy Squid."));
    await render(<Tasks />);
    expect(nodes("Form")).toHaveLength(0);
    expect(pop).not.toHaveBeenCalled();
    expect(nodes("List")).toHaveLength(1);
    expect(launchCommand).not.toHaveBeenCalledWith(
      expect.objectContaining({ context: { subtitle: "Review task · Research launch videos" } }),
    );
  },
);

test("a task ended on another device removes the screen on refresh", async () => {
  vi.useFakeTimers();
  h.request.mockResolvedValueOnce({ ok: true, snapshot: running });
  await render(<Tasks />);
  await advance(3_000);
  expect(nodes("Detail")).toHaveLength(0);
  expect(nodes("Action.Push").some((node) => node.props.title === "New Task")).toBe(true);
});

function useMemoryStorage() {
  const items = new Map<string, string>();
  LocalStorage.getItem.mockImplementation(async (key: string) => items.get(key));
  LocalStorage.setItem.mockImplementation(async (key: string, value: string) => {
    items.set(key, value);
  });
  LocalStorage.removeItem.mockImplementation(async (key: string) => {
    items.delete(key);
  });
  return items;
}

test("automatic refresh recovers from a connection failure and continues updating task state", async () => {
  vi.useFakeTimers();
  h.request.mockRejectedValueOnce(new Error("Could not connect to Happy Squid. Check your connection."));
  await render(<Tasks />);
  expect(nodes("Detail")[0].props.markdown).toContain("Could not connect");
  h.request.mockResolvedValue({ ok: true, snapshot: running });
  await advance(3_000);
  expect(nodes("Detail")[0].props.markdown).toContain("Write launch notes");
  expect(nodes("Detail")[0].props.markdown).not.toContain("Could not connect");
  h.request.mockResolvedValue({ ok: true, snapshot: { ...running, task: { ...running.task!, paused: true } } });
  await advance(3_000);
  expect(launchCommand).toHaveBeenLastCalledWith({
    name: "tasks",
    type: LaunchType.Background,
    context: { subtitle: "Paused · Write launch notes" },
  });
  expect(h.request).toHaveBeenCalledTimes(3);
});

test("background reads are silent, never overlap, and stop when the page closes", async () => {
  vi.useFakeTimers();
  await render(<Tasks />);
  const read = deferred<{ ok: true; snapshot: TaskSnapshot }>();
  h.request.mockReturnValue(read.promise);
  await advance(3_000);
  expect(nodes("List")[0].props.isLoading).toBe(false);
  expect(nodes("Action.Push").some((node) => node.props.title === "New Task")).toBe(true);
  await advance(15_000);
  expect(h.request).toHaveBeenCalledTimes(2);
  await act(async () => tree.unmount());
  await act(async () => read.resolve({ ok: true, snapshot: idle }));
  await advance(30_000);
  expect(h.request).toHaveBeenCalledTimes(2);
});

test("reopening displays cached tasks and opens New Task while the live read is still pending", async () => {
  vi.useFakeTimers();
  useMemoryStorage();
  await render(<Tasks />);
  await act(async () => tree.unmount());
  const read = deferred<{ ok: true; snapshot: TaskSnapshot }>();
  h.request.mockReturnValue(read.promise);
  await render(<Tasks />);
  expect(nodes("List")[0].props.isLoading).toBe(false);
  const target = nodes("Action.Push").find((node) => node.props.title === "New Task")!.props.target;
  let pushed!: ReactTestRenderer;
  await act(async () => {
    pushed = create(target);
  });
  try {
    expect(pushed.root.findAll((node) => node.type === ("Form" as unknown))[0].props.isLoading).toBeFalsy();
    expect(pushed.root.findAll((node) => node.type === ("Form.TextArea" as unknown))).toHaveLength(1);
    expect(h.request).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ action: { kind: "snapshot" } }),
    );
    await act(async () => read.resolve({ ok: true, snapshot: running }));
    expect(nodes("Detail")[0].props.markdown).toContain("Write launch notes");
  } finally {
    await act(async () => pushed.unmount());
  }
});

test("cached countdowns include time away, accounts never share snapshots, and sign-out clears the cache", async () => {
  vi.useFakeTimers();
  const items = useMemoryStorage();
  h.request.mockResolvedValue({ ok: true, snapshot: running });
  await render(<Tasks />);
  await act(async () => tree.unmount());
  await advance(60_000);
  const read = deferred<{ ok: true; snapshot: TaskSnapshot }>();
  h.request.mockReturnValue(read.promise);
  await render(<Tasks />);
  expect(launchCommand).toHaveBeenLastCalledWith({
    name: "tasks",
    type: LaunchType.Background,
    context: { subtitle: "28m left · Write launch notes" },
  });
  await act(async () => tree.unmount());
  h.userId = "user-2";
  await render(<Tasks />);
  expect(nodes("Detail")[0].props.markdown).toBe("");
  expect(nodes("List")).toHaveLength(0);
  await act(async () => tree.unmount());
  h.userId = "user-1";
  h.channel.mockImplementation(() => ({
    on(_type: string, _filter: unknown, callback: typeof h.progress) {
      h.progress = callback;
      return this;
    },
    subscribe() {
      return this;
    },
  }));
  h.removeChannel.mockResolvedValue("ok");
  h.request.mockResolvedValue({ ok: true, snapshot: running });
  await render(<Tasks />);
  await act(async () => {
    await nodes("Action")
      .find((node) => node.props.title === "Sign Out")!
      .props.onAction();
  });
  expect(items.size).toBe(0);
  expect(h.signOut).toHaveBeenCalledWith({ scope: "local" });
  await act(async () => read.resolve({ ok: true, snapshot: idle }));
  expect(items.size).toBe(0);
});

test("the idle launcher reopens New Task, Bookmarked and Recent without flashing the finished task while offline", async () => {
  vi.useFakeTimers();
  useMemoryStorage();
  h.request.mockResolvedValue({ ok: true, snapshot: running });
  await render(<Tasks />);
  await act(async () => tree.unmount());
  await advance(30 * 60_000);

  const finished: TaskSnapshot = {
    ...idle,
    recentTasks: [
      { description: "Read a paper", durationMinutes: 15, bookmarked: true, workedMs: 0 },
      { description: running.task!.description, durationMinutes: 30, workedMs: 30 * 60_000 },
    ],
  };
  h.request.mockResolvedValue({ ok: true, snapshot: finished });
  environment.launchType = LaunchType.Background;
  await TaskLauncher();
  expect(updateCommandMetadata).toHaveBeenLastCalledWith({ subtitle: "Start a task" });

  const read = deferred<never>();
  h.request.mockReturnValue(read.promise);
  await render(<Tasks />);
  expect(nodes("Detail")).toHaveLength(0);
  expect(nodes("List.Item").map((node) => node.props.title)).toEqual([
    "New Task",
    "Read a paper",
    "Write launch notes",
  ]);
  expect(nodes("List.Section").map((node) => node.props.title)).toEqual([undefined, "Bookmarked", "Recent"]);
  expect(nodes("Action.Push").some((node) => node.props.title === "New Task")).toBe(true);

  await act(async () => read.reject(new Error("Offline")));
  expect(nodes("Detail")).toHaveLength(0);
  expect(nodes("List.Item").map((node) => node.props.title)).toContain("New Task");
});

test("review replies stay inline, send with Enter, and receive the next answer automatically", async () => {
  vi.useFakeTimers();
  h.request.mockResolvedValue({ ok: true, snapshot: rejected });
  await render(<Tasks />);
  expect(nodes("Action.Push").map((node) => node.props.title)).not.toContain("Reply");
  expect(nodes("Action.SubmitForm")[0].props.shortcut).toEqual({ modifiers: [], key: "return" });
  await act(async () => reply().props.onChange("These examples inform our launch."));
  const checking: TaskSnapshot = {
    ...rejected,
    review: {
      ...rejected.review!,
      id: "review-2",
      status: "checking",
      chat: [...rejected.review!.chat, { role: "user", content: "These examples inform our launch." }],
    },
  };
  h.request.mockResolvedValue({ ok: true, snapshot: checking });
  await act(async () => {
    await nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  expect(h.request).toHaveBeenLastCalledWith(expect.anything(), {
    action: { kind: "review-message", message: "These examples inform our launch." },
    expectedTaskId: null,
    expectedReviewId: "review-1",
  });
  expect(reply()).toBeDefined();
  expect(nodes("Form.LinkAccessory")[0].props.text).toBe("Cancel");
  expect(nodes("Action").some((node) => node.props.title === "Edit Task")).toBe(false);
  expect(nodes("Action.SubmitForm")).toHaveLength(0);
  expect(
    nodes("Form.Description").filter((node) => node.props.text === "These examples inform our launch."),
  ).toHaveLength(1);
  expect(nodes("Form")[0].props.isLoading).toBe(true);
  expect(pop).not.toHaveBeenCalled();
  expect(nodes("Action")[0].props.title).toBe("Checking Task");
  await act(async () => {
    await nodes("Action")[0].props.onAction();
  });
  expect(h.request).toHaveBeenCalledTimes(2);
  await advance(3_000);
  const answered: TaskSnapshot = {
    ...checking,
    review: {
      ...checking.review!,
      status: "unproductive",
      chat: [...checking.review!.chat, { role: "assistant", content: "What will you produce from that research?" }],
    },
  };
  h.request.mockResolvedValue({ ok: true, snapshot: answered });
  await advance(1_000);
  expect(
    nodes("Form.Description").some((node) => node.props.text === "What will you produce from that research?"),
  ).toBe(true);
  expect(reply().props.value).toBe("");
  expect(reply().props.autoFocus).toBe(true);
  await act(async () => reply().props.onChange("A follow-up reply"));
  h.request.mockResolvedValue({ ok: true, snapshot: running });
  await act(async () => {
    await nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  expect(h.request).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ expectedReviewId: "review-2" }),
  );
  expect(nodes("Detail")[0].props.markdown).toContain("Write launch notes");
});

test("task text stays plain and Edit Task returns to the parent form once", async () => {
  h.request.mockResolvedValue({ ok: true, snapshot: rejected });
  await render(<Tasks />);
  expect(nodes("Form.TextField").every((node) => node.props.title === "Reply")).toBe(true);
  expect(nodes("Form.Description").find((node) => node.props.title === "Task")?.props.text).toBe(
    rejected.review!.description,
  );
  expect(reply().props.autoFocus).toBe(true);
  const edit = nodes("Action").find((node) => node.props.title === "Edit Task")!;
  expect(edit.props.shortcut).toEqual({ modifiers: ["cmd"], key: "e" });
  await act(async () => {
    edit.props.onAction();
    edit.props.onAction();
  });
  expect(pop).toHaveBeenCalledOnce();
  expect(push).not.toHaveBeenCalled();
  expect(h.request.mock.calls.every((call) => call[1].action.kind === "snapshot")).toBe(true);
});

test.each(["unproductive", "checking"] as const)("the top-right Cancel cancels a %s review once", async (status) => {
  vi.useFakeTimers();
  const reviewing: TaskSnapshot = { ...rejected, review: { ...rejected.review!, status } };
  h.request.mockResolvedValue({ ok: true, snapshot: reviewing });
  await render(<Tasks />);
  const link = nodes("Form.LinkAccessory")[0];
  expect(link.props.text).toBe("Cancel");
  const url = new URL(link.props.target);
  expect(`${url.protocol}//${url.host}${url.pathname}`).toBe(
    `raycast://extensions/${manifest.owner ?? manifest.author}/${manifest.name}/tasks`,
  );
  const launchContext = JSON.parse(url.searchParams.get("context")!);
  expect(launchContext).toEqual({ cancelReview: { reviewId: "review-1", taskId: null } });
  await act(async () => tree.unmount());
  const cancellation = deferred<{ ok: true; snapshot: TaskSnapshot }>();
  h.request.mockImplementation(async (_client, request) =>
    request.action.kind === "review-cancel" ? cancellation.promise : { ok: true, snapshot: reviewing },
  );
  await render(<Tasks launchContext={launchContext} />);
  expect(h.request).toHaveBeenLastCalledWith(expect.anything(), {
    action: { kind: "review-cancel" },
    expectedTaskId: null,
    expectedReviewId: "review-1",
  });
  expect(nodes("Form.LinkAccessory")).toHaveLength(0);
  expect(nodes("Form.TextArea")).toHaveLength(0);
  await act(async () => cancellation.resolve({ ok: true, snapshot: idle }));
  expect(nodes("List.Item").map((node) => node.props.title)).toContain("New Task");
  h.request.mockResolvedValue({ ok: true, snapshot: reviewing });
  await advance(3_000);
  expect(h.request.mock.calls.filter((call) => call[1].action.kind === "review-cancel")).toHaveLength(1);
});

test("Cancel discards a review edit while preserving the running task", async () => {
  const editing: TaskSnapshot = { ...running, review: { ...rejected.review!, kind: "edit" } };
  h.request.mockImplementation(async (_client, request) => ({
    ok: true,
    snapshot: request.action.kind === "review-cancel" ? running : editing,
  }));
  await render(<Tasks launchContext={{ cancelReview: { reviewId: "review-1", taskId: "task-1" } }} />);
  expect(h.request).toHaveBeenLastCalledWith(expect.anything(), {
    action: { kind: "review-cancel" },
    expectedTaskId: "task-1",
    expectedReviewId: "review-1",
  });
  expect(nodes("Detail")[0].props.markdown).toContain("Write launch notes");
  expect(h.request.mock.calls.some((call) => call[1].action.kind === "stop")).toBe(false);
});

test.each([
  ["finished review", running],
  ["another review", { ...rejected, review: { ...rejected.review!, id: "review-2" } }],
  ["different task", { ...running, review: rejected.review }],
] as const)("a Cancel link for a %s cannot change current state", async (_name, snapshot) => {
  h.request.mockResolvedValue({ ok: true, snapshot });
  await render(<Tasks launchContext={{ cancelReview: { reviewId: "review-1", taskId: null } }} />);
  expect(h.request.mock.calls.every((call) => call[1].action.kind === "snapshot")).toBe(true);
});

test("an uncertain Cancel is not automatically replayed after a refresh", async () => {
  vi.useFakeTimers();
  h.request.mockImplementation(async (_client, request) => {
    if (request.action.kind === "review-cancel") throw new Error("Could not confirm that action.");
    return { ok: true, snapshot: rejected };
  });
  await render(<Tasks launchContext={{ cancelReview: { reviewId: "review-1", taskId: null } }} />);
  await advance(3_000);
  expect(h.request.mock.calls.filter((call) => call[1].action.kind === "review-cancel")).toHaveLength(1);
  expect(nodes("Form.Description").some((node) => node.props.text === "Could not confirm that action.")).toBe(true);
  expect(nodes("Form.LinkAccessory")[0].props.text).toBe("Cancel");
});

test("an unconfirmed reply is not replayed, keeps its draft, and remains visible after background recovery", async () => {
  vi.useFakeTimers();
  h.request.mockResolvedValue({ ok: true, snapshot: rejected });
  await render(<Tasks />);
  await act(async () => reply().props.onChange("Please keep this reply"));
  h.request.mockRejectedValueOnce(new Error("Could not confirm that action."));
  await act(async () => {
    await nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  await advance(3_000);
  expect(reply().props.value).toBe("Please keep this reply");
  expect(nodes("Form.Description").some((node) => node.props.text === "Could not confirm that action.")).toBe(true);
  expect(nodes("Form.Description").filter((node) => node.props.title === "You")).toHaveLength(0);
  expect(nodes("Form.Description").some((node) => node.props.text === "...")).toBe(false);
  expect(h.request.mock.calls.filter((call) => call[1].action.kind === "review-message")).toHaveLength(1);
});

test("Enter immediately shows the reply, keeps its composer focused for Escape, and preserves a new draft", async () => {
  vi.useFakeTimers();
  h.request.mockResolvedValue({ ok: true, snapshot: rejected });
  await render(<Tasks />);
  expect(nodes("Form.Description").some((node) => node.props.text === "...")).toBe(false);
  await act(async () => reply().props.onChange("First reply"));
  const composer = reply();
  const send = deferred<{ ok: true; snapshot: TaskSnapshot }>();
  h.request.mockReturnValue(send.promise);
  let submission!: Promise<void>;
  await act(async () => {
    const submit = nodes("Action.SubmitForm")[0].props.onSubmit;
    submission = submit();
    await submit();
  });
  expect(reply()).toBeDefined();
  expect(nodes("Form.TextField").every((node) => node.props.title === "Reply")).toBe(true);
  expect(nodes("Form.LinkAccessory")).toHaveLength(0);
  expect(nodes("Action.SubmitForm")).toHaveLength(0);
  expect(nodes("Form")[0].props.isLoading).toBe(true);
  expect(
    nodes("Form.Description")
      .filter((node) => ["You", "Happy Squid"].includes(node.props.title))
      .map((node) => node.props.text),
  ).toEqual(["Explain how this helps.", "First reply", "..."]);
  const loadingRow = nodes("Form.Description").find((node) => node.props.text === "...");
  expect(loadingRow?.props.title).toBe("Happy Squid");
  expect(reply().props.value).toBe("");
  expect(reply().props.autoFocus).toBe(true);
  expect(reply()).toBe(composer);
  await act(async () => reply().props.onChange("Next draft"));
  await act(async () => nodes("Action")[0].props.onAction());
  const sentRow = nodes("Form.Description").find((node) => node.props.text === "First reply");
  await act(async () => {
    send.resolve({
      ok: true,
      snapshot: {
        ...rejected,
        review: {
          ...rejected.review!,
          id: "review-2",
          status: "checking",
          chat: [...rejected.review!.chat, { role: "user", content: "First reply" }],
        },
      },
    });
    await submission;
  });
  expect(reply()).toBeDefined();
  expect(nodes("Action.SubmitForm")).toHaveLength(0);
  expect(nodes("Form.Description").filter((node) => node.props.text === "First reply")).toHaveLength(1);
  expect(nodes("Form.Description").find((node) => node.props.text === "First reply") === sentRow).toBe(true);
  expect(nodes("Form.Description").find((node) => node.props.text === "...") === loadingRow).toBe(true);
  await advance(3_000);
  expect(nodes("Form.Description").find((node) => node.props.text === "First reply") === sentRow).toBe(true);
  expect(reply()).toBeDefined();
  expect(nodes("Form.Description").filter((node) => node.props.text === "...")).toHaveLength(1);
  h.request.mockResolvedValue({
    ok: true,
    snapshot: {
      ...rejected,
      review: {
        ...rejected.review!,
        id: "review-2",
        chat: [
          ...rejected.review!.chat,
          { role: "user", content: "First reply" },
          { role: "assistant", content: "Please explain the goal." },
        ],
      },
    },
  });
  await advance(1_000);
  expect(nodes("Form.Description").find((node) => node.props.text === "First reply") === sentRow).toBe(true);
  expect(nodes("Form.Description").some((node) => node.props.text === "...")).toBe(false);
  expect(nodes("Form.Description").some((node) => node.props.text === "Please explain the goal.")).toBe(true);
  expect(reply()).toBe(composer);
  expect(reply().props.value).toBe("Next draft");
  expect(reply().props.autoFocus).toBe(true);
  expect(h.request.mock.calls.filter((call) => call[1].action.kind === "review-message")).toHaveLength(1);
});

test("empty or overlong chat replies never reach the task bridge", async () => {
  h.request.mockResolvedValue({ ok: true, snapshot: rejected });
  await render(<Tasks />);
  for (const value of ["   ", "x".repeat(idle.descriptionLimit + 1)]) {
    await act(async () => reply().props.onChange(value));
    await act(async () => {
      await nodes("Action.SubmitForm")[0].props.onSubmit();
    });
    expect(reply().props.error).toBeTruthy();
  }
  expect(h.request).toHaveBeenCalledTimes(1);
});

test("a failed send never overwrites a draft typed while waiting", async () => {
  h.request.mockResolvedValue({ ok: true, snapshot: rejected });
  await render(<Tasks />);
  await act(async () => reply().props.onChange("First reply"));
  const send = deferred<never>();
  h.request.mockReturnValueOnce(send.promise);
  let submission!: Promise<void>;
  await act(async () => {
    submission = nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  await act(async () => reply().props.onChange("Keep my new draft"));
  await act(async () => {
    send.reject(new Error("Could not confirm that action."));
    await submission;
  });
  expect(reply().props.value).toBe("Keep my new draft");
  expect(reply().props.autoFocus).toBe(true);
  expect(nodes("Form.Description").filter((node) => node.props.title === "You")).toHaveLength(0);
});

test("replies start on one line and expand explicitly without changing the draft", async () => {
  h.request.mockResolvedValue({ ok: true, snapshot: rejected });
  await render(<Tasks />);
  const compact = reply();
  expect(compact.type).toBe("Form.TextField");
  const message = "A longer explanation that stays in the same native field while I am still typing.";
  await act(async () => compact.props.onChange(message));
  expect(reply()).toBe(compact);
  await act(async () =>
    nodes("Action")
      .find((node) => node.props.title === "Expand Reply")!
      .props.onAction(),
  );
  expect(reply().type).toBe("Form.TextArea");
  expect(reply().props.value).toBe(message);
  expect(reply().props.autoFocus).toBe(true);
  await act(async () => reply().props.onChange(`${message}\nA second line.`));
  h.request.mockResolvedValue({
    ok: true,
    snapshot: {
      ...rejected,
      review: {
        ...rejected.review!,
        status: "checking",
        chat: [...rejected.review!.chat, { role: "user", content: `${message}\nA second line.` }],
      },
    },
  });
  await act(async () => nodes("Action.SubmitForm")[0].props.onSubmit());
  expect(reply().type).toBe("Form.TextField");
  expect(reply().props.value).toBe("");
  expect(reply().props.autoFocus).toBe(true);
});

test("a manual refresh shares a background read already in flight", async () => {
  vi.useFakeTimers();
  await render(<Tasks />);
  const read = deferred<{ ok: true; snapshot: TaskSnapshot }>();
  h.request.mockReturnValueOnce(read.promise);
  await advance(3_000);
  let refresh!: Promise<void>;
  await act(async () => {
    refresh = nodes("Action")
      .find((node) => node.props.title === "Refresh Tasks")!
      .props.onAction();
  });
  expect(h.request).toHaveBeenCalledTimes(2);
  await act(async () => {
    read.resolve({ ok: true, snapshot: idle });
    await refresh;
  });
  expect(h.request).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ action: { kind: "snapshot" } }),
  );
});

test("a slow cache read cannot overwrite a newer live snapshot", async () => {
  const cached = deferred<string>();
  LocalStorage.getItem.mockReturnValue(cached.promise);
  h.request.mockResolvedValue({ ok: true, snapshot: running });
  await render(<Tasks />);
  await act(async () => {
    await nodes("Action")
      .find((node) => node.props.title === "Refresh Tasks")!
      .props.onAction();
  });
  expect(nodes("Detail")[0].props.markdown).toContain("Write launch notes");
  await act(async () => cached.resolve(JSON.stringify({ snapshot: idle, receivedAt: Date.now() })));
  expect(nodes("Detail")[0].props.markdown).toContain("Write launch notes");
});

test("a remote check keeps the reply and its draft without replacing the focused field", async () => {
  vi.useFakeTimers();
  h.request.mockResolvedValue({ ok: true, snapshot: rejected });
  await render(<Tasks />);
  await act(async () => reply().props.onChange("An unsent explanation"));
  h.request.mockResolvedValue({
    ok: true,
    snapshot: { ...rejected, review: { ...rejected.review!, id: "remote-check", status: "checking" } },
  });
  await advance(3_000);
  expect(reply()).toBeDefined();
  expect(nodes("Action.SubmitForm")).toHaveLength(0);
  h.request.mockResolvedValue({
    ok: true,
    snapshot: { ...rejected, review: { ...rejected.review!, id: "remote-check", status: "error" } },
  });
  await advance(1_000);
  expect(reply().props.value).toBe("An unsent explanation");
  expect(reply().props.autoFocus).toBe(true);
});

test.each(["start", "edit", "review-edit", "lock"] as const)(
  "%s preserves the original form and values with a loading indicator after valid Enter",
  async (purpose) => {
    await form(purpose === "review-edit" ? rejected : purpose === "start" ? idle : running, purpose);
    await act(async () => {
      if (purpose === "lock") nodes("Form.TextField")[0].props.onChange("15");
      else nodes("Form.TextArea")[0].props.onChange("Write launch notes");
    });
    const original = nodes("Form")[0];
    const fields = [...nodes("Form.TextArea"), ...nodes("Form.TextField"), ...nodes("Form.Dropdown")];
    const values = fields.map((field) => field.props.value);
    const response = deferred<{ ok: true; snapshot: TaskSnapshot }>();
    h.request.mockReturnValue(response.promise);
    let submission!: Promise<void>;
    await act(async () => {
      const submit = nodes("Action.SubmitForm")[0].props.onSubmit;
      submission = submit();
      await submit();
    });
    expect(nodes("Form")[0]).toBe(original);
    expect(original.props.isLoading).toBe(true);
    expect([...nodes("Form.TextArea"), ...nodes("Form.TextField"), ...nodes("Form.Dropdown")]).toEqual(fields);
    expect(nodes("Detail")).toHaveLength(0);
    await act(async () => {
      fields.forEach((field) => field.props.onChange("999"));
      await nodes("Action.SubmitForm")[0].props.onSubmit();
    });
    expect(fields.map((field) => field.props.value)).toEqual(values);
    expect(h.request.mock.calls.filter((call) => call[1].action.kind !== "snapshot")).toHaveLength(1);
    await act(async () => {
      response.resolve({ ok: true, snapshot: running });
      await submission;
    });
    expect(pop).toHaveBeenCalledTimes(1);
    // Native navigation may not unmount the form in the same render as its reply.
    expect(nodes("Form")[0]).toBe(original);
    expect(fields.map((field) => field.props.value)).toEqual(values);
  },
);

test("a failed task submission keeps its unchanged description and can be submitted again", async () => {
  await form(idle);
  await act(async () => nodes("Form.TextArea")[0].props.onChange("Keep this task description"));
  const response = deferred<{ ok: false; error: string }>();
  h.request.mockReturnValueOnce(response.promise);
  let submission!: Promise<void>;
  await act(async () => {
    submission = nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  expect(nodes("Form.TextArea")[0].props.value).toBe("Keep this task description");
  expect(nodes("Form")[0].props.isLoading).toBe(true);
  await act(async () => {
    response.resolve({ ok: false, error: "Could not confirm that action." });
    await submission;
  });
  expect(nodes("Form.TextArea")[0].props.value).toBe("Keep this task description");
  expect(pop).not.toHaveBeenCalled();
  h.request.mockResolvedValue({ ok: true, snapshot: running });
  await act(async () => {
    await nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  expect(pop).toHaveBeenCalledTimes(1);
});

test("live replies survive early delivery, ignore stale fragments, and settle from the snapshot", async () => {
  vi.useFakeTimers();
  h.request.mockResolvedValue({ ok: true, snapshot: rejected });
  await render(<Tasks />);
  expect(h.channel).toHaveBeenCalledWith("task-review:user-1", { config: { private: true } });
  await act(async () => reply().props.onChange("My research goal"));
  const send = deferred<{ ok: true; snapshot: TaskSnapshot }>();
  h.request.mockReturnValue(send.promise);
  let submission!: Promise<void>;
  await act(async () => {
    submission = nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  const sent = nodes("Form.Description").find((node) => node.props.title === "You");
  const checking: TaskSnapshot = {
    ...rejected,
    review: {
      ...rejected.review!,
      id: "review-2",
      status: "checking",
      chat: [...rejected.review!.chat, { role: "user", content: "My research goal" }],
    },
  };
  await act(async () => {
    h.progress({ payload: { reviewId: "review-2", sequence: 2, text: "Please explain" } });
    send.resolve({ ok: true, snapshot: checking });
    await submission;
  });
  const live = nodes("Form.Description").find((node) => node.props.text === "Please explain");
  expect(live?.props.title).toBe("Happy Squid");
  expect(reply()).toBeDefined();
  expect(nodes("Form.TextField").every((node) => node.props.title === "Reply")).toBe(true);
  const writes = LocalStorage.setItem.mock.calls.length;
  const reads = h.request.mock.calls.length;
  await act(async () => {
    h.progress({ payload: { reviewId: "review-2", sequence: 3, text: "Please explain your goal." } });
    h.progress({ payload: { reviewId: "review-2", sequence: 2, text: "Old fragment" } });
    h.progress({ payload: { reviewId: "review-1", sequence: 90, text: "Old review" } });
    h.progress({ payload: { reviewId: "review-2", sequence: "4", text: "Malformed" } });
  });
  expect(live?.props.text).toBe("Please explain your goal.");
  expect(nodes("Form.Description").find((node) => node.props.title === "You")).toBe(sent);
  expect(LocalStorage.setItem).toHaveBeenCalledTimes(writes);
  expect(h.request).toHaveBeenCalledTimes(reads);
  await act(async () => h.progress({ payload: { reviewId: "review-2", sequence: 4, text: "" } }));
  expect(live?.props.text).toBe("...");
  await act(async () => h.progress({ payload: { reviewId: "review-2", sequence: 5, text: "Retry explanation" } }));
  expect(live?.props.text).toBe("Retry explanation");
  h.request.mockResolvedValue({
    ok: true,
    snapshot: {
      ...checking,
      review: {
        ...checking.review!,
        status: "unproductive",
        chat: [...checking.review!.chat, { role: "assistant", content: "Final explanation" }],
      },
    },
  });
  await advance(3_000);
  await act(async () => h.progress({ payload: { reviewId: "review-2", sequence: 6, text: "Late fragment" } }));
  expect(
    nodes("Form.Description")
      .filter((node) => node.props.title === "Happy Squid")
      .map((node) => node.props.text),
  ).toEqual(["Explain how this helps.", "Final explanation"]);
  expect(reply()).toBeDefined();
  await act(async () => tree.unmount());
  expect(h.removeChannel).toHaveBeenCalledTimes(1);
});

test.each(["immediate", "delayed"])(
  "a submitted task waits for the final review before navigating back (%s acknowledgement)",
  async (timing) => {
    vi.useFakeTimers();
    await render(<Tasks />);
    const target = nodes("Action.Push").find((node) => node.props.title === "New Task")!.props.target;
    let editor!: ReactTestRenderer;
    await act(async () => {
      editor = create(target);
    });
    const inEditor = (type: string) => editor.root.findAll((node) => node.type === (type as unknown));
    const checking: TaskSnapshot = {
      ...rejected,
      review: { ...rejected.review!, description: "Write the release notes", status: "checking", chat: [] },
    };
    const destinations: string[] = [];
    pop.mockImplementation(() => {
      destinations.push(nodes("Form")[0]?.props.navigationTitle ?? (nodes("List").length ? "Task list" : "Other"));
    });
    try {
      await act(async () => inEditor("Form.TextArea")[0].props.onChange("Write the release notes"));
      const response = deferred<{ ok: true; snapshot: TaskSnapshot }>();
      h.request.mockReturnValueOnce(
        timing === "immediate" ? Promise.resolve({ ok: true, snapshot: checking }) : response.promise,
      );
      let submission!: Promise<void>;
      await act(async () => {
        submission = inEditor("Action.SubmitForm")[0].props.onSubmit();
      });
      expect(inEditor("Form.TextArea")[0].props.value).toBe("Write the release notes");
      expect(inEditor("Form")[0].props.isLoading).toBe(true);
      if (timing === "delayed") expect(pop).not.toHaveBeenCalled();
      await act(async () => {
        response.resolve({ ok: true, snapshot: checking });
        await submission;
      });
      expect(destinations).toEqual([]);
      expect(inEditor("Form.TextArea")[0].props.value).toBe("Write the release notes");
      h.request.mockResolvedValue({ ok: true, snapshot: checking });
      await advance(3_000);
      expect(destinations).toEqual([]);
      h.request.mockResolvedValue({ ok: true, snapshot: rejected });
      await advance(1_000);
      expect(destinations).toEqual(["Happy Squid"]);
    } finally {
      pop.mockReset();
      await act(async () => editor.unmount());
    }
  },
);

test.each([false, true])("visible pause/resume controls use the displayed task (paused: %s)", async (paused) => {
  const snapshot = { ...running, task: { ...running.task!, paused } };
  h.request.mockResolvedValue({ ok: true, snapshot });
  await render(<Tasks />);
  const button = nodes("Detail.Metadata.TagList.Item").find(
    (node) => node.props.text === (paused ? "Resume" : "Pause"),
  )!;
  expect(h.request).toHaveBeenCalledTimes(1);
  await act(async () => button.props.onAction());
  expect(h.request).toHaveBeenLastCalledWith(expect.anything(), {
    action: { kind: paused ? "resume" : "pause" },
    expectedTaskId: "task-1",
    expectedReviewId: null,
  });
});

test.each(["Stop", "Complete", "Lock…"])("visible %s preserves confirmation and cancellation", async (label) => {
  const snapshot = {
    ...running,
    task: { ...running.task!, openEnded: label === "Complete", source: "todoist" as const },
  };
  h.request.mockResolvedValue({ ok: true, snapshot });
  await render(<Tasks />);
  const button = nodes("Detail.Metadata.TagList.Item").find((node) => node.props.text === label)!;
  confirmAlert.mockResolvedValueOnce(false);
  await act(async () => button.props.onAction());
  expect(h.request).toHaveBeenCalledTimes(1);
  if (label !== "Lock…") expect(confirmAlert.mock.calls.at(-1)![0].message).toContain("Todoist");
  await act(async () => button.props.onAction());
  expect(h.request).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({
      action: { kind: label === "Stop" ? "stop" : label === "Complete" ? "complete" : "lock" },
      expectedTaskId: "task-1",
    }),
  );
});

test("a locked task exposes no pause, edit, finish or lock controls in either surface", async () => {
  h.request.mockResolvedValue({
    ok: true,
    snapshot: { ...running, task: { ...running.task!, locked: true, canLock: false } },
  });
  await render(<Tasks />);
  expect(nodes("Detail.Metadata.TagList")).toHaveLength(0);
  for (const title of ["Pause Task", "Edit Task", "Stop Task", "Complete Task", "Lock Task…"])
    expect(nodes("Action").map((node) => node.props.title)).not.toContain(title);
});

test("visible controls cannot send another mutation while a change is outstanding", async () => {
  h.request.mockResolvedValue({ ok: true, snapshot: running });
  await render(<Tasks />);
  const pause = nodes("Detail.Metadata.TagList.Item").find((node) => node.props.text === "Pause")!.props.onAction;
  const pending = deferred<{ ok: true; snapshot: TaskSnapshot }>();
  h.request.mockReturnValueOnce(pending.promise);
  let request!: Promise<void>;
  await act(async () => {
    request = pause();
  });
  expect(nodes("Detail.Metadata.TagList")).toHaveLength(0);
  await act(async () => pause());
  expect(h.request).toHaveBeenCalledTimes(2);
  await act(async () => {
    pending.resolve({ ok: true, snapshot: running });
    await request;
  });
});
