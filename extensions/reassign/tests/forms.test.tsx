import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  pop: vi.fn(),
  stateful: false,
  hookIndex: 0,
  hookValues: [] as unknown[],
  toast: {},
  result: { ok: true, data: { failed: 0 } } as {
    ok: boolean;
    data?: { failed: number; undoToken?: string };
    code?: string;
    message?: string;
  },
  undo: vi.fn(),
  signIn: vi.fn(),
  launch: vi.fn(),
  hud: vi.fn(),
  effects: [] as (() => void)[],
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (v: unknown) => {
    if (!mock.stateful) return [v, vi.fn()];
    const index = mock.hookIndex++;
    if (!(index in mock.hookValues)) mock.hookValues[index] = v;
    return [
      mock.hookValues[index],
      (next: unknown) => {
        mock.hookValues[index] = typeof next === "function" ? next(mock.hookValues[index]) : next;
      },
    ];
  },
  useRef: (v: unknown) => {
    if (!mock.stateful) return { current: v };
    const index = mock.hookIndex++;
    if (!(index in mock.hookValues)) mock.hookValues[index] = { current: v };
    return mock.hookValues[index];
  },
  useEffect: (fn: () => void) => {
    mock.effects.push(fn);
  },
}));
vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({ showBlockName: false, notifyTransitions: false }),
  MenuBarExtra: Object.assign("MenuBarExtra", { Item: "MenuItem", Section: "MenuSection" }),
  launchCommand: mock.launch,
  LaunchType: { UserInitiated: "user" },
  showHUD: mock.hud,
  Action: Object.assign("Action", { SubmitForm: "SubmitForm", OpenInBrowser: "OpenInBrowser" }),
  ActionPanel: "ActionPanel",
  Form: Object.assign("Form", {
    Description: "Description",
    TextField: "TextField",
    TextArea: "TextArea",
    Checkbox: "Checkbox",
    Dropdown: Object.assign("Dropdown", { Item: "Item" }),
    DatePicker: Object.assign("DatePicker", { Type: { Date: "date", DateTime: "datetime" } }),
  }),
  List: Object.assign("List", { EmptyView: "EmptyView" }),
  Icon: {},
  Color: {},
  Keyboard: { Shortcut: { Common: {} } },
  useNavigation: () => ({ pop: mock.pop }),
  showToast: async () => mock.toast,
  Toast: { Style: { Failure: "failure", Success: "success", Animated: "animated" } },
}));
vi.mock("@raycast/utils", () => ({
  useCachedPromise: () => ({ data: { ok: false, code: "signed_out" }, revalidate: vi.fn() }),
}));
vi.mock("../src/lib/oauth", () => ({ signIn: mock.signIn }));
vi.mock("../src/lib/api", () => ({
  updateEvent: async () => mock.result,
  eventsBatch: async () => mock.result,
  undo: mock.undo,
}));
vi.mock("../src/components/calendar-fields", () => ({
  CALENDAR_NONE: "__none",
  useCalendars: () => ({ writable: [] }),
  calendarEditFields: () => ({}),
  CalendarFields: "CalendarFields",
}));
import NowCommand from "../src/now";
import { EditForm } from "../src/components/edit-form";
import { MoveForm } from "../src/components/move-form";
import { BacklogScheduleForm } from "../src/components/backlog-schedule-form";
import { useAgendaMutations } from "../src/components/agenda-actions";
import { refusalView } from "../src/components/states";
import { runMutation } from "../src/lib/feedback";
const event = { id: "id", name: "work", date: "2026-09-21", start: "23:00", end: "23:30" };
beforeEach(() => {
  mock.pop.mockReset();
  mock.stateful = false;
  mock.hookValues = [];
  mock.hookIndex = 0;
  mock.signIn.mockReset();
  mock.effects = [];
  mock.toast = {};
  mock.undo.mockReset();
  mock.undo.mockResolvedValue({ ok: true });
});
for (const success of [false, true]) {
  it(`edit form pops only on success (${success}), keeping overnight range`, async () => {
    const submit = vi.fn(async () => success);
    const tree = EditForm({ event, areas: [], activityTypes: [], onSubmit: submit });
    await tree.props.actions.props.children.props.onSubmit({
      name: "work",
      end: "01:00",
      notes: "",
      areaId: "",
      activityTypeId: "",
    });
    expect(submit).toHaveBeenCalledWith({ end: "01:00", endNextDay: true });
    expect(mock.pop).toHaveBeenCalledTimes(success ? 1 : 0);
  });
  it(`move form pops only on success (${success})`, async () => {
    const tree = MoveForm({ event, onMove: async () => success });
    await tree.props.actions.props.children.props.onSubmit({ start: new Date(2026, 8, 22, 9) });
    expect(mock.pop).toHaveBeenCalledTimes(success ? 1 : 0);
  });
  it(`inbox form pops only on success (${success})`, async () => {
    const tree = BacklogScheduleForm({ item: { id: "id", name: "idea" }, onSubmit: async () => success });
    await tree.props.actions.props.children.props.onSubmit({ date: new Date(2026, 8, 22), start: "09:00" });
    expect(mock.pop).toHaveBeenCalledTimes(success ? 1 : 0);
  });
}
it.each([
  { ok: false, code: "network", message: "offline" },
  { ok: true, data: { failed: 1 } },
  { ok: true, data: { failed: 0 } },
])("mutation callbacks return explicit success: %j", async (result) => {
  mock.result = result;
  const hooks = useAgendaMutations({ revalidate: vi.fn() });
  const success = result.ok && result.data?.failed === 0;
  expect(await hooks.applyEdit("Saving", "Saved", "id", { name: "new" })).toBe(success);
  expect(await hooks.mutate("Moving", "Moved", [{ op: "move", id: "id", start: "09:00" }])).toBe(success);
});
it("a successful Inbox save without an undo token is still successful", async () => {
  expect(await runMutation("Saving", "Saved", async () => ({ ok: true, data: { failed: 0 } }))).toEqual({
    ok: true,
    undoToken: null,
  });
});
it("intentional logout never starts OAuth on recovery view mount", () => {
  const element = refusalView({ ok: false, code: "signed_out", message: "Signed out" }, vi.fn());
  (element.type as (props: unknown) => unknown)(element.props);
  mock.effects.forEach((fn) => fn());
  expect(mock.signIn).not.toHaveBeenCalled();
});

it("Now offers foreground sign-in and reports a failed launch", async () => {
  mock.launch.mockRejectedValueOnce(new Error("cannot launch"));
  mock.hud.mockClear();
  const tree = NowCommand();
  const signInItem = tree.props.children.find(
    (child: { props?: { title?: string } } | false) => child?.props?.title === "Sign in to Reassign",
  );
  expect(signInItem).toBeDefined();
  expect(mock.signIn).not.toHaveBeenCalled();
  await signInItem.props.onAction();
  expect(mock.launch).toHaveBeenCalledWith({ name: "agenda", type: "user" });
  expect(mock.hud).toHaveBeenCalledWith(expect.stringContaining("Could not open Agenda"));
});
it("editing only the name preserves hidden notes", async () => {
  const submit = vi.fn(async () => true);
  const tree = EditForm({
    event: { ...event, notes: "Keep these notes" },
    areas: [],
    activityTypes: [],
    onSubmit: submit,
  });
  await tree.props.actions.props.children.props.onSubmit({ name: "Renamed", end: event.end });
  expect(submit).toHaveBeenCalledWith({ name: "Renamed" });
});
it("rejects invalid clock values without submitting the Inbox form", async () => {
  const submit = vi.fn(async () => true);
  const tree = BacklogScheduleForm({ item: { id: "id", name: "idea" }, onSubmit: submit });
  await tree.props.actions.props.children.props.onSubmit({ date: new Date(), start: "25:99" });
  expect(submit).not.toHaveBeenCalled();
  expect(mock.pop).not.toHaveBeenCalled();
});

// Regression: the toast's Undo button (primaryAction.onAction) used to revert
// the server without revalidating the caller's list cache, leaving the on-screen
// list stale after a toast Undo. The fix threads an onUndone reconciliation
// hook through applyUndoToast / runMutation; the agenda hook wires revalidate
// (and clears the panel undo token) on it.
it("toast Undo (primaryAction.onAction) reverts the server and revalidates the agenda cache", async () => {
  mock.result = { ok: true, data: { failed: 0, undoToken: "tok" } };
  const revalidate = vi.fn();
  const hooks = useAgendaMutations({ revalidate });
  await hooks.applyEdit("Saving", "Saved", "id", { name: "new" });
  expect(revalidate).toHaveBeenCalledTimes(1); // applyEdit itself revalidates on success
  const action = (mock.toast as { primaryAction?: { onAction: (t: unknown) => Promise<void> } }).primaryAction;
  expect(action).toBeDefined();
  revalidate.mockClear();
  await action!.onAction(mock.toast);
  expect(mock.undo).toHaveBeenCalledWith(["tok"]);
  expect(revalidate).toHaveBeenCalled(); // toast Undo now revalidates the list
});

// runMutation threads onUndone to the toast Undo button. Covers the Inbox helper
// path (which the agenda applyEdit test above does not exercise) and guards that
// onUndone fires only when the revert succeeds.
it("runMutation fires onUndone after a successful toast Undo", async () => {
  const onUndone = vi.fn();
  mock.result = { ok: true, data: { failed: 0, undoToken: "tok" } };
  const result = await runMutation("Scheduling…", "Scheduled the block", async () => mock.result, undefined, {
    onUndone,
  });
  expect(result).toEqual({ ok: true, undoToken: "tok" });
  const action = (mock.toast as { primaryAction?: { onAction: (t: unknown) => Promise<void> } }).primaryAction;
  expect(action).toBeDefined();
  await action!.onAction(mock.toast);
  expect(mock.undo).toHaveBeenCalledWith(["tok"]);
  expect(onUndone).toHaveBeenCalledTimes(1);
});

it("runMutation does not fire onUndone when the toast Undo fails", async () => {
  const onUndone = vi.fn();
  mock.result = { ok: true, data: { failed: 0, undoToken: "tok" } };
  mock.undo.mockResolvedValue({ ok: false, code: "network", message: "offline" });
  await runMutation("Scheduling…", "Scheduled the block", async () => mock.result, undefined, { onUndone });
  await (mock.toast as { primaryAction: { onAction: (t: unknown) => Promise<void> } }).primaryAction.onAction(
    mock.toast,
  );
  expect(mock.undo).toHaveBeenCalledWith(["tok"]);
  expect(onUndone).not.toHaveBeenCalled();
});

function renderAgendaMutations(revalidate: () => void) {
  mock.stateful = true;
  mock.hookIndex = 0;
  return useAgendaMutations({ revalidate });
}

it("undoing an older toast preserves the newer panel undo", async () => {
  const revalidate = vi.fn();
  let hooks = renderAgendaMutations(revalidate);
  mock.result = { ok: true, data: { failed: 0, undoToken: "older" } };
  await hooks.applyEdit("Saving", "Saved", "id", { name: "first" });
  const olderToast = mock.toast as { primaryAction: { onAction: (t: unknown) => Promise<void> } };
  mock.toast = {};
  mock.result = { ok: true, data: { failed: 0, undoToken: "newer" } };
  await hooks.applyEdit("Saving", "Saved", "id", { name: "second" });
  await olderToast.primaryAction.onAction(olderToast);
  hooks = renderAgendaMutations(revalidate);
  expect(hooks.lastUndoToken).toBe("newer");
  await hooks.runUndo();
  expect(mock.undo.mock.calls).toEqual([[["older"]], [["newer"]]]);
});

it("panel and toast share in-flight and completed undo state", async () => {
  const revalidate = vi.fn();
  let hooks = renderAgendaMutations(revalidate);
  mock.result = { ok: true, data: { failed: 0, undoToken: "tok" } };
  await hooks.applyEdit("Saving", "Saved", "id", { name: "new" });
  hooks = renderAgendaMutations(revalidate);
  const toast = mock.toast as { primaryAction?: { onAction: (t: unknown) => Promise<void> } };
  const action = toast.primaryAction!;
  let finish!: (result: { ok: boolean }) => void;
  mock.undo.mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const pending = hooks.runUndo();
  await action.onAction(toast);
  expect(mock.undo).toHaveBeenCalledTimes(1);
  finish({ ok: true });
  await pending;
  expect(toast.primaryAction).toBeUndefined();
  await action.onAction(toast);
  await hooks.runUndo();
  expect(mock.undo).toHaveBeenCalledTimes(1);
});

it("a panel undo failure preserves both affordances for retry", async () => {
  const revalidate = vi.fn();
  let hooks = renderAgendaMutations(revalidate);
  mock.result = { ok: true, data: { failed: 0, undoToken: "tok" } };
  await hooks.applyEdit("Saving", "Saved", "id", { name: "new" });
  hooks = renderAgendaMutations(revalidate);
  mock.undo.mockRejectedValueOnce(new Error("offline"));
  await hooks.runUndo();
  const toast = mock.toast as { primaryAction?: unknown; title: string };
  expect(toast.title).toBe("Could not undo the change");
  expect(toast.primaryAction).toBeDefined();
  await hooks.runUndo();
  expect(mock.undo).toHaveBeenCalledTimes(2);
  expect(toast.primaryAction).toBeUndefined();
});

it.each([false, true])(
  "does not replay a successful undo when reconciliation fails (async: %s)",
  async (asyncFailure) => {
    const onUndone = vi.fn(() => {
      if (asyncFailure) return Promise.reject(new Error("refresh failed"));
      throw new Error("refresh failed");
    });
    mock.result = { ok: true, data: { failed: 0, undoToken: "tok" } };
    await runMutation("Saving", "Saved", async () => mock.result, undefined, { onUndone });
    const toast = mock.toast as {
      primaryAction?: { onAction: (t: unknown) => Promise<void> };
      title: string;
      message: string;
    };
    const action = toast.primaryAction!;
    await action.onAction(toast);
    expect(toast.title).toBe("Undid the change");
    expect(toast.message).toBe("Refresh the list to see the change.");
    expect(toast.primaryAction).toBeUndefined();
    await action.onAction(toast);
    expect(mock.undo).toHaveBeenCalledTimes(1);
    expect(onUndone).toHaveBeenCalledTimes(1);
  },
);
