import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  environment,
  launchCommand,
  LaunchType,
  LocalStorage,
  showToast,
  Toast,
  updateCommandMetadata,
} from "./raycast-api";
import Tasks from "../src/tasks";
import type { TaskSnapshot } from "../src/vendor/task-control";

const h = vi.hoisted(() => ({
  request: vi.fn(),
  getSession: vi.fn(),
  stopAutoRefresh: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("../src/client", () => ({
  requestTasks: h.request,
  createTaskClient: h.createClient,
  RAYCAST_SUPABASE_URL: "https://task-test.invalid",
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
const running: TaskSnapshot = {
  ...idle,
  task: {
    id: "task-1",
    description: "Study fluid dynamics",
    context: "",
    source: null,
    sourceUrl: null,
    startedAt: idle.capturedAt,
    elapsedMs: 3 * 60_000,
    remainingMs: 2 * 60_000,
    paused: false,
    openEnded: false,
    locked: false,
    lockEndsAt: null,
    canLock: true,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  LocalStorage.setItem.mockReset().mockResolvedValue(undefined);
  environment.launchType = LaunchType.Background;
  h.createClient.mockReturnValue({ auth: { getSession: h.getSession, stopAutoRefresh: h.stopAutoRefresh } });
  h.getSession.mockReset().mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
  h.request.mockReset().mockResolvedValue({ ok: true, snapshot: idle });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

test("Enter immediately opens the task page without waiting on authentication or a network request", async () => {
  environment.launchType = LaunchType.UserInitiated;
  await Tasks();
  expect(launchCommand).toHaveBeenCalledExactlyOnceWith({
    name: "manage-tasks",
    type: LaunchType.UserInitiated,
    context: undefined,
  });
  expect(h.createClient).not.toHaveBeenCalled();
  expect(updateCommandMetadata).not.toHaveBeenCalled();
});

test.each([
  { raycastConnection: { code: "one-time-code", state: "pending-state" } },
  { cancelReview: { reviewId: "review-1", taskId: null } },
])("existing connection and cancellation callbacks reach the task page unchanged: %j", async (launchContext) => {
  environment.launchType = LaunchType.UserInitiated;
  await Tasks({ launchContext });
  expect(launchCommand).toHaveBeenCalledExactlyOnceWith({
    name: "manage-tasks",
    type: LaunchType.UserInitiated,
    context: launchContext,
  });
  expect(h.request).not.toHaveBeenCalled();
});

test.each([
  undefined,
  { raycastConnection: { code: "one-time-code", state: "pending-state" } },
  { cancelReview: { reviewId: "review-1", taskId: null } },
])(
  "a disabled task page reports a launch failure without crashing or replaying the callback: %j",
  async (launchContext) => {
    environment.launchType = LaunchType.UserInitiated;
    launchCommand.mockRejectedValueOnce(new Error("Manage Tasks is disabled"));
    await expect(Tasks({ launchContext })).resolves.toBeUndefined();
    expect(showToast).toHaveBeenCalledExactlyOnceWith({
      style: Toast.Style.Failure,
      title: "Could not open Manage Tasks",
      message: "Error: Manage Tasks is disabled",
    });
    expect(launchCommand).toHaveBeenCalledExactlyOnceWith({
      name: "manage-tasks",
      type: LaunchType.UserInitiated,
      context: launchContext,
    });
    expect(h.createClient).not.toHaveBeenCalled();
    expect(updateCommandMetadata).not.toHaveBeenCalled();
  },
);

test("scheduled runs advance the countdown and pick up pause, completion and tasks started elsewhere with no page open", async () => {
  for (const [snapshot, subtitle] of [
    [running, "2m left · Study fluid dynamics"],
    [{ ...running, task: { ...running.task!, remainingMs: 60_000 } }, "1m left · Study fluid dynamics"],
    [{ ...running, task: { ...running.task!, paused: true } }, "Paused · Study fluid dynamics"],
    [idle, "Start a task"],
    [{ ...running, task: { ...running.task!, id: "task-2", description: "Read a paper" } }, "2m left · Read a paper"],
  ] as const) {
    h.request.mockResolvedValueOnce({ ok: true, snapshot });
    await Tasks();
    expect(updateCommandMetadata).toHaveBeenLastCalledWith({ subtitle });
    expect(LocalStorage.setItem).toHaveBeenLastCalledWith(
      "task-snapshot-v2:https://task-test.invalid:user-1",
      expect.any(String),
    );
    expect(JSON.parse(LocalStorage.setItem.mock.lastCall![1])).toEqual({ snapshot, receivedAt: expect.any(Number) });
  }
  expect(launchCommand).not.toHaveBeenCalled();
  expect(h.request.mock.calls.every(([, request]) => request.action.kind === "snapshot")).toBe(true);
  expect(h.stopAutoRefresh).toHaveBeenCalledTimes(5);
});

test("a page update changes the launcher immediately without fetching or opening a page", async () => {
  await Tasks({ launchContext: { subtitle: "Paused · Study fluid dynamics" } });
  expect(updateCommandMetadata).toHaveBeenCalledExactlyOnceWith({ subtitle: "Paused · Study fluid dynamics" });
  expect(h.createClient).not.toHaveBeenCalled();
  expect(launchCommand).not.toHaveBeenCalled();
});

test("the launcher waits for the refreshed page cache before advertising Start a task", async () => {
  let stored!: () => void;
  LocalStorage.setItem.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        stored = resolve;
      }),
  );
  const pending = Tasks();
  await vi.waitFor(() => expect(LocalStorage.setItem).toHaveBeenCalledOnce());
  expect(updateCommandMetadata).not.toHaveBeenCalled();
  stored();
  await pending;
  expect(updateCommandMetadata).toHaveBeenCalledExactlyOnceWith({ subtitle: "Start a task" });
});

test("a slow scheduled read cannot overwrite a newer page update", async () => {
  let finish!: (response: unknown) => void;
  h.request.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = Tasks();
  await vi.waitFor(() => expect(h.request).toHaveBeenCalledOnce());
  await Tasks({ launchContext: { subtitle: "Paused · Study fluid dynamics" } });
  finish({ ok: true, snapshot: running });
  await pending;
  expect(updateCommandMetadata).toHaveBeenCalledExactlyOnceWith({ subtitle: "Paused · Study fluid dynamics" });
  expect(h.stopAutoRefresh).toHaveBeenCalledOnce();
  expect(LocalStorage.setItem).not.toHaveBeenCalled();
});

test("signed-out background runs clear the old task without making requests", async () => {
  h.getSession.mockResolvedValue({ data: { session: null }, error: null });
  await Tasks();
  expect(updateCommandMetadata).toHaveBeenCalledExactlyOnceWith({ subtitle: "Sign in to Happy Squid" });
  expect(h.request).not.toHaveBeenCalled();
  expect(h.stopAutoRefresh).toHaveBeenCalledOnce();
});

test.each([null, { user: { id: "user-2" } }])(
  "a pending read cannot display the former account after sign-out or account change",
  async (session) => {
    h.getSession.mockResolvedValueOnce({ data: { session: { user: { id: "user-1" } } }, error: null });
    h.getSession.mockResolvedValueOnce({ data: { session }, error: null });
    h.request.mockResolvedValue({ ok: true, snapshot: running });
    await Tasks();
    expect(updateCommandMetadata).toHaveBeenCalledExactlyOnceWith({
      subtitle: session ? null : "Sign in to Happy Squid",
    });
    expect(LocalStorage.setItem).not.toHaveBeenCalled();
  },
);

test("a failed refresh clears a frozen countdown and the next scheduled run recovers", async () => {
  h.request.mockRejectedValueOnce(new Error("Offline"));
  await Tasks();
  expect(updateCommandMetadata).toHaveBeenLastCalledWith({ subtitle: null });
  h.request.mockResolvedValueOnce({ ok: true, snapshot: running });
  await Tasks();
  expect(updateCommandMetadata).toHaveBeenLastCalledWith({ subtitle: "2m left · Study fluid dynamics" });
  expect(h.stopAutoRefresh).toHaveBeenCalledTimes(2);
});

test("a failed cache write does not advertise a new page state, and the next refresh recovers", async () => {
  LocalStorage.setItem.mockRejectedValueOnce(new Error("Storage unavailable"));
  await Tasks();
  expect(updateCommandMetadata).toHaveBeenLastCalledWith({ subtitle: null });
  await Tasks();
  expect(updateCommandMetadata).toHaveBeenLastCalledWith({ subtitle: "Start a task" });
  expect(h.stopAutoRefresh).toHaveBeenCalledTimes(2);
});
