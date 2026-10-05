import type { ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { LocalStorage, pop, push } from "./raycast-api";
import Tasks from "../src/manage-tasks";
import { TaskProvider, useAccount } from "../src/task-state";
import { TaskForm } from "../src/components/task-form";
import { TaskReviewFlow } from "../src/components/task-review-flow";
import type { TaskSnapshot } from "../src/vendor/task-control";

const h = vi.hoisted(() => ({ request: vi.fn(), progress: (_event: { payload: unknown }) => {} }));
vi.mock("../src/client", () => ({
  requestTasks: h.request,
  RAYCAST_SUPABASE_URL: "https://task-test.invalid",
  createTaskClient: () => ({
    channel: () => ({
      on(_type: string, _filter: unknown, callback: typeof h.progress) {
        h.progress = callback;
        return this;
      },
      subscribe() {
        return this;
      },
    }),
    removeChannel: async () => {},
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getSession: async () => ({ data: { session: { user: { id: "flow-test" } } } }),
      stopAutoRefresh() {},
    },
  }),
}));
const idle: TaskSnapshot = {
  deviceId: "task-service",
  capturedAt: 1_700_000_000_000,
  task: null,
  review: null,
  recentTasks: [],
  durationChoices: [5],
  defaultDurationMinutes: 5,
  customDurationAllowed: false,
  maxDurationMinutes: 5,
  descriptionLimit: 2000,
  canStart: true,
  weekSpent: false,
};
const rejected: TaskSnapshot = {
  ...idle,
  canStart: false,
  review: {
    id: "review-1",
    kind: "start",
    description: "Research video examples",
    durationMinutes: 5,
    status: "unproductive",
    chat: [{ role: "assistant", content: "What will you produce?" }],
  },
};
const running: TaskSnapshot = {
  ...idle,
  canStart: false,
  task: {
    id: "running-task",
    description: "Write notes",
    context: "",
    source: null,
    sourceUrl: null,
    startedAt: idle.capturedAt,
    elapsedMs: 0,
    remainingMs: 300000,
    paused: false,
    openEnded: false,
    locked: false,
    lockEndsAt: null,
    canLock: true,
  },
};
const focus = vi.fn();
const nodeMock = (element: ReactElement) => ({ focus: () => focus((element.props as { id?: string }).id) });
let root: ReactTestRenderer;
const routes: { tree: ReactTestRenderer; onPop?: () => void }[] = [];
function nodes(type: string, tree = routes[routes.length - 1]?.tree ?? root) {
  return tree.root.findAll((node) => node.type === (type as unknown));
}
async function render(snapshot = rejected) {
  h.request.mockResolvedValue({ ok: true, snapshot });
  await act(async () => {
    root = create(<Tasks />, { createNodeMock: nodeMock });
  });
}
async function back() {
  await act(async () => pop());
}
async function poll(snapshot: TaskSnapshot) {
  h.request.mockResolvedValue({ ok: true, snapshot });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3_000);
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  LocalStorage.getItem.mockResolvedValue(undefined);
  LocalStorage.setItem.mockResolvedValue(undefined);
  push.mockImplementation((target: ReactElement, onPop?: () => void) => {
    routes.push({ tree: create(target, { createNodeMock: nodeMock }), onPop });
  });
  pop.mockImplementation(() => {
    const route = routes.pop();
    route?.onPop?.();
    route?.tree.unmount();
  });
});
afterEach(async () => {
  await act(async () => {
    for (const route of routes.splice(0)) route.tree.unmount();
    root?.unmount();
  });
  push.mockReset();
  pop.mockReset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("Back reveals the current task editor without mutation or a refresh reopening the chat", async () => {
  await render();
  expect(routes).toHaveLength(1);
  expect(nodes("Form")[0].props.navigationTitle).toBe("Happy Squid");
  await back();
  expect(routes).toHaveLength(0);
  expect(nodes("Form")[0].props.navigationTitle).toBe("Happy Squid");
  expect(nodes("Form.TextArea")[0].props.value).toBe("Research video examples");
  expect(nodes("Form.Dropdown")[0].props.value).toBe("5");
  expect(nodes("Action.SubmitForm")[0].props.title).toBe("Start Task");
  await poll(rejected);
  expect(routes).toHaveLength(0);
  expect(h.request.mock.calls.every((call) => call[1].action.kind === "snapshot")).toBe(true);
});

test.each([
  ["start", "approved"],
  ["start", "unproductive"],
  ["edit", "approved"],
  ["edit", "unproductive"],
  ["start", "error"],
] as const)("a %s check keeps its original page until %s", async (kind, verdict) => {
  await render(kind === "edit" ? running : idle);
  await act(async () => {
    if (kind === "edit") {
      nodes("Detail.Metadata.TagList.Item")
        .find((node) => node.props.text === "Edit")!
        .props.onAction();
    } else {
      push(nodes("Action.Push").find((node) => node.props.title === "New Task")!.props.target);
    }
  });
  await act(async () => nodes("Form.TextArea")[0].props.onChange("Research video examples"));
  const editor = nodes("Form")[0];
  const description = nodes("Form.TextArea")[0];
  const checking: TaskSnapshot = {
    ...(kind === "edit" ? running : idle),
    review: { ...rejected.review!, kind, status: "checking", chat: [] },
  };
  h.request.mockResolvedValue({ ok: true, snapshot: checking });
  await act(async () => nodes("Action.SubmitForm")[0].props.onSubmit());
  expect(routes).toHaveLength(1);
  expect(nodes("Form")[0]).toBe(editor);
  expect(editor.props.isLoading).toBe(true);
  expect(nodes("Form.TextArea")[0]).toBe(description);
  await act(async () => {
    h.progress({ payload: { reviewId: "review-1", sequence: 1, text: "An unfinished explanation" } });
    await nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  await poll(checking);
  expect(nodes("Form")[0]).toBe(editor);
  expect(description.props.value).toBe("Research video examples");
  expect(nodes("Form.TextField")).toHaveLength(0);
  expect(nodes("Form.Description").some((node) => node.props.title === "Happy Squid")).toBe(false);
  expect(h.request.mock.calls.filter((call) => call[1].action.kind !== "snapshot")).toHaveLength(1);
  await poll(
    verdict === "approved" ? running : { ...checking, review: { ...rejected.review!, kind, status: verdict } },
  );
  if (verdict === "approved") {
    expect(routes).toHaveLength(0);
    expect(nodes("Detail")[0].props.markdown).toContain("Write notes");
  } else {
    expect(routes).toHaveLength(1);
    expect(nodes("Action.SubmitForm")[0].props.title).toBe("Send Reply");
    expect(nodes("Form.Description").find((node) => node.props.title === "Happy Squid")!.props.text).toBe(
      "What will you produce?",
    );
  }
});

test.each(["approved", "unproductive"])("reopening a pending check waits for %s before navigating", async (verdict) => {
  const checking: TaskSnapshot = { ...rejected, review: { ...rejected.review!, status: "checking", chat: [] } };
  await render(checking);
  const editor = nodes("Form")[0];
  expect(routes).toHaveLength(0);
  expect(editor.props.isLoading).toBe(true);
  expect(nodes("Form.TextArea")[0].props.value).toBe(rejected.review!.description);
  await poll(checking);
  expect(nodes("Form")[0]).toBe(editor);
  expect(routes).toHaveLength(0);
  await poll(verdict === "approved" ? running : rejected);
  expect(routes).toHaveLength(verdict === "approved" ? 0 : 1);
  expect(nodes(verdict === "approved" ? "Detail" : "Form.TextField")).toHaveLength(1);
});

test("editing and rechecking keep the editor in place until the verdict opens one chat level", async () => {
  await render();
  await back();
  await act(async () => nodes("Form.TextArea")[0].props.onChange("Write three research notes"));
  const editor = nodes("Form")[0];
  const description = nodes("Form.TextArea")[0];
  const checking: TaskSnapshot = {
    ...rejected,
    review: {
      ...rejected.review!,
      id: "review-2",
      description: "Write three research notes",
      status: "checking",
      chat: [],
    },
  };
  h.request.mockResolvedValue({ ok: true, snapshot: checking });
  await act(async () => nodes("Action.SubmitForm")[0].props.onSubmit());
  expect(h.request).toHaveBeenLastCalledWith(expect.anything(), {
    action: { kind: "review-edit", message: "Write three research notes", durationMinutes: 5 },
    expectedTaskId: null,
    expectedReviewId: "review-1",
  });
  expect(routes).toHaveLength(0);
  expect(nodes("Form")[0]).toBe(editor);
  expect(editor.props.isLoading).toBe(true);
  expect(nodes("Form.TextArea")[0]).toBe(description);
  await act(async () => description.props.onChange("Do not change the submitted task"));
  expect(description.props.value).toBe("Write three research notes");
  await poll(checking);
  expect(routes).toHaveLength(0);
  expect(nodes("Form")[0]).toBe(editor);
  await poll({ ...checking, review: { ...checking.review!, status: "unproductive" } });
  expect(routes).toHaveLength(1);
  expect(nodes("Action.SubmitForm")[0].props.title).toBe("Send Reply");
  await back();
  expect(routes).toHaveLength(0);
  expect(nodes("Form.TextArea")[0].props.value).toBe("Write three research notes");
  h.request.mockResolvedValue({ ok: true, snapshot: checking });
  await act(async () => nodes("Action.SubmitForm")[0].props.onSubmit());
  expect(routes).toHaveLength(0);
  expect(h.request).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ expectedReviewId: "review-2" }),
  );
});

test("after a chat reply, Back edits against the latest review ID", async () => {
  await render();
  await act(async () => nodes("Form.TextField")[0].props.onChange("I need examples"));
  const answered = {
    ...rejected,
    review: {
      ...rejected.review!,
      id: "reply-review",
      chat: [
        ...rejected.review!.chat,
        { role: "user" as const, content: "I need examples" },
        { role: "assistant" as const, content: "What output?" },
      ],
    },
  };
  h.request.mockResolvedValue({ ok: true, snapshot: answered });
  await act(async () => nodes("Action.SubmitForm")[0].props.onSubmit());
  await back();
  await act(async () => nodes("Form.TextArea")[0].props.onChange("Make a slide"));
  h.request.mockResolvedValue({
    ok: true,
    snapshot: { ...answered, review: { ...answered.review, status: "checking", description: "Make a slide" } },
  });
  await act(async () => nodes("Action.SubmitForm")[0].props.onSubmit());
  expect(h.request).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ expectedReviewId: "reply-review" }),
  );
});

test.each([
  [1, "approved"],
  [2, "approved"],
  [1, "unproductive"],
  [2, "unproductive"],
] as const)("starting from %i pushed routes goes straight to %s", async (depth, verdict) => {
  await render(idle);
  for (let index = 0; index < depth; index++) {
    const target = nodes("Action.Push", root).find((node) => node.props.title === "New Task")!.props.target;
    await act(async () => {
      push(target);
    });
  }
  await act(async () => nodes("Form.TextArea")[0].props.onChange("Research video examples"));
  const editor = nodes("Form")[0];
  const description = nodes("Form.TextArea")[0];
  let resolve!: (value: unknown) => void;
  h.request.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  let submission!: Promise<void>;
  await act(async () => {
    submission = nodes("Action.SubmitForm")[0].props.onSubmit();
  });
  expect(nodes("Form")[0]).toBe(editor);
  expect(editor.props.isLoading).toBe(true);
  expect(nodes("Form.TextArea")[0]).toBe(description);
  await act(async () => {
    resolve({ ok: true, snapshot: verdict === "approved" ? running : rejected });
    await submission;
  });
  if (verdict === "approved") {
    expect(routes).toHaveLength(0);
    expect(nodes("Detail")[0].props.markdown).toContain("Write notes");
    return;
  }
  expect(routes).toHaveLength(1);
  expect(nodes("Form")[0].props.navigationTitle).toBe("Happy Squid");
  await back();
  expect(routes).toHaveLength(0);
  expect(nodes("Form.TextArea")[0].props.value).toBe("Research video examples");
});

test.each(["Cancel Task", "remote approval"])("%s closes the chat without reopening the editor", async (action) => {
  await render();
  if (action === "Cancel Task") {
    h.request.mockResolvedValue({ ok: true, snapshot: idle });
    await act(async () =>
      nodes("Action")
        .find((node) => node.props.title === action)!
        .props.onAction(),
    );
  } else {
    await poll({
      ...idle,
      task: {
        id: "task",
        description: "Write notes",
        context: "",
        source: null,
        sourceUrl: null,
        startedAt: idle.capturedAt,
        elapsedMs: 0,
        remainingMs: 300000,
        paused: false,
        openEnded: false,
        locked: false,
        lockEndsAt: null,
        canLock: true,
      },
    });
  }
  expect(routes).toHaveLength(0);
  expect(nodes("Form")).toHaveLength(0);
  expect(nodes(action === "Cancel Task" ? "List" : "Detail")).toHaveLength(1);
});

test("a review that lapses closes its chat and editor without reopening either", async () => {
  await render({ ...rejected, review: { ...rejected.review!, expiresAt: rejected.capturedAt + 5_000 } });
  expect(routes).toHaveLength(1);
  h.request.mockReturnValue(new Promise(() => {}));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_000);
  });
  expect(routes).toHaveLength(0);
  expect(nodes("Form")).toHaveLength(0);
  expect(nodes("List")).toHaveLength(1);
  expect(h.request.mock.calls.every((call) => call[1].action.kind === "snapshot")).toBe(true);
});

test("an asynchronously loaded review still has an editor beneath the chat", async () => {
  function Harness() {
    const account = useAccount();
    return (
      <TaskProvider account={account}>
        <TaskReviewFlow />
      </TaskProvider>
    );
  }
  h.request.mockResolvedValue({ ok: true, snapshot: rejected });
  await act(async () => {
    root = create(<Harness />);
  });
  expect(routes).toHaveLength(1);
  expect(nodes("Form.TextArea", root)[0].props.value).toBe("Research video examples");
  await back();
  expect(nodes("Form.TextArea")[0].props.value).toBe("Research video examples");
});

test.each(["immediate", "delayed"])(
  "Cancel launch goes directly to the task list without pushing chat (%s)",
  async (timing) => {
    const cancelled: TaskSnapshot = {
      ...idle,
      recentTasks: [
        { description: "Saved task", bookmarked: true, durationMinutes: 5, workedMs: 0 },
        { description: "Completed task", bookmarked: false, durationMinutes: 5, workedMs: 300000 },
      ],
    };
    let resolve!: (response: unknown) => void;
    const pending = new Promise((done) => {
      resolve = done;
    });
    h.request.mockImplementation(async (_client, request) =>
      request.action.kind === "review-cancel"
        ? timing === "delayed"
          ? pending
          : { ok: true, snapshot: cancelled }
        : { ok: true, snapshot: rejected },
    );
    await act(async () => {
      root = create(<Tasks launchContext={{ cancelReview: { reviewId: "review-1", taskId: null } }} />);
    });
    expect(push).not.toHaveBeenCalled();
    if (timing === "delayed") {
      expect(nodes("Detail")[0].props.isLoading).toBe(true);
      await act(async () => resolve({ ok: true, snapshot: cancelled }));
    }
    expect(routes).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
    expect(nodes("List.Item").map((node) => node.props.title)).toEqual(["New Task", "Saved task", "Completed task"]);
  },
);

test("Cancel callbacks delivered to the open command close each review once", async () => {
  await render();
  for (const reviewId of ["review-1", "review-2"]) {
    if (reviewId === "review-2") await poll({ ...rejected, review: { ...rejected.review!, id: reviewId } });
    h.request.mockResolvedValue({ ok: true, snapshot: idle });
    await act(async () => root.update(<Tasks launchContext={{ cancelReview: { reviewId, taskId: null } }} />));
    expect(routes).toHaveLength(0);
    expect(nodes("List.Item").map((node) => node.props.title)).toContain("New Task");
  }
  expect(push).toHaveBeenCalledTimes(2);
  expect(
    h.request.mock.calls
      .filter((call) => call[1].action.kind === "review-cancel")
      .map((call) => call[1].expectedReviewId),
  ).toEqual(["review-1", "review-2"]);
});

test("Back restores a nondefault duration and submitting a new custom duration keeps it for the next Back", async () => {
  const reviewing: TaskSnapshot = {
    ...rejected,
    customDurationAllowed: true,
    maxDurationMinutes: 1440,
    durationChoices: [5, 15, 30, 45, 60],
    review: { ...rejected.review!, durationMinutes: 45 },
  };
  await render(reviewing);
  expect(nodes("Form.TextField").every((node) => node.props.title === "Reply")).toBe(true);
  await back();
  expect(nodes("Form.Dropdown")[0].props.value).toBe("45");
  expect(nodes("Action.SubmitForm")[0].props.title).toBe("Start Task");
  await act(async () => nodes("Form.Dropdown")[0].props.onChange("custom"));
  await act(async () => nodes("Form.TextField")[0].props.onChange("37"));
  h.request.mockResolvedValue({
    ok: true,
    snapshot: { ...reviewing, review: { ...reviewing.review!, id: "new-time", durationMinutes: 37 } },
  });
  await act(async () => nodes("Action.SubmitForm")[0].props.onSubmit());
  expect(h.request).toHaveBeenLastCalledWith(expect.anything(), {
    action: { kind: "review-edit", message: reviewing.review!.description, durationMinutes: 37, customDuration: true },
    expectedTaskId: null,
    expectedReviewId: "review-1",
  });
  await back();
  expect(nodes("Form.Dropdown")[0].props.value).toBe("37");
  expect(nodes("Form.TextArea")[0].props.value).toBe(reviewing.review!.description);
});

test.each(["Edit", "Lock…"])("Back from the visible %s control returns to the running task", async (label) => {
  const running: TaskSnapshot = {
    ...idle,
    canStart: false,
    task: {
      id: "running-task",
      description: "Write notes",
      context: "",
      source: "todoist",
      sourceUrl: null,
      startedAt: idle.capturedAt,
      elapsedMs: 60000,
      remainingMs: null,
      paused: false,
      openEnded: true,
      locked: false,
      lockEndsAt: null,
      canLock: true,
    },
  };
  await render(running);
  await act(async () =>
    nodes("Detail.Metadata.TagList.Item")
      .find((node) => node.props.text === label)!
      .props.onAction(),
  );
  expect(routes).toHaveLength(1);
  expect(nodes("Form")).toHaveLength(1);
  if (label === "Edit") expect(nodes("Form.TextArea")[0].props.value).toBe("Write notes");
  await back();
  expect(routes).toHaveLength(0);
  expect(nodes("Detail")[0].props.markdown).toContain("Write notes");
  await poll(running);
  expect(routes).toHaveLength(0);
  expect(h.request.mock.calls.every((call) => call[1].action.kind === "snapshot")).toBe(true);
});

test("Back from New Task returns to the task list without submitting", async () => {
  await render(idle);
  const target = nodes("Action.Push").find((node) => node.props.title === "New Task")!.props.target;
  await act(async () => push(target));
  await act(async () => nodes("Form.TextArea")[0].props.onChange("Unsubmitted draft"));
  await back();
  expect(routes).toHaveLength(0);
  expect(nodes("List.Item")[0].props.title).toBe("New Task");
  expect(h.request.mock.calls.every((call) => call[1].action.kind === "snapshot")).toBe(true);
});

test("Back preserves the native editor and restores its field focus once without stealing it on refresh", async () => {
  await render();
  const editor = root.root.findByType(TaskForm);
  expect(focus).not.toHaveBeenCalled();
  await back();
  expect(root.root.findByType(TaskForm)).toBe(editor);
  expect(focus).toHaveBeenCalledExactlyOnceWith("description");
  await poll(rejected);
  expect(focus).toHaveBeenCalledTimes(1);
});
