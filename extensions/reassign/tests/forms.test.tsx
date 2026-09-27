import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  writable: [] as { id: string }[],
  calendarFields: {} as Record<string, unknown>,
  pop: vi.fn(),
  stateful: false,
  hookIndex: 0,
  hookValues: [] as unknown[],
  toast: {},
  result: { ok: true, data: { results: [{ index: 0, status: "ok" }] } } as {
    ok: boolean;
    data?: {
      results: { index: number; status: string; error?: { code: string; message: string } }[];
      undoToken?: string;
    };
    code?: string;
    message?: string;
  },
  undo: vi.fn(),
  rebase: vi.fn(),
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
  getSchedule: vi.fn(),
  writeEvents: async () => mock.result,
  undo: mock.undo,
  rebaseOnSeries: mock.rebase,
}));
vi.mock("../src/components/calendar-fields", () => ({
  CALENDAR_NONE: "__none",
  useCalendars: () => ({ writable: mock.writable }),
  calendarEditFields: () => mock.calendarFields,
  CalendarFields: "CalendarFields",
}));
import NowCommand from "../src/now";
import { EditForm } from "../src/components/edit-form";
import { MoveForm } from "../src/components/move-form";
import { BacklogScheduleForm } from "../src/components/backlog-schedule-form";
import { useAgendaMutations } from "../src/components/agenda-actions";
import { refusalView } from "../src/components/states";
import { runMutation } from "../src/lib/feedback";
const event = { id: "id", name: "work", start: "2026-09-21T23:00", end: "2026-09-21T23:30" };
beforeEach(() => {
  mock.writable = [];
  mock.calendarFields = {};
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
      end: new Date(2026, 8, 22, 1),
      notes: "",
      areaId: "",
      activityTypeId: "",
    });
    // The end is a local datetime on its own day; no flag rides along.
    expect(submit).toHaveBeenCalledWith({ op: "update", id: "id", end: "2026-09-22T01:00" });
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
const okRow = { index: 0, status: "ok" };
const errorRow = { index: 0, status: "error", error: { code: "conflict", message: "Time occupied" } };
it.each([
  { ok: false, code: "network", message: "offline" },
  { ok: true, data: { results: [errorRow] } },
  { ok: true, data: { results: [okRow] } },
])("mutation callbacks return explicit success: %j", async (result) => {
  mock.result = result;
  const hooks = useAgendaMutations({ revalidate: vi.fn() });
  const success = result.ok && result.data?.results[0].status === "ok";
  expect(await hooks.mutate("Saving", "Saved", [{ op: "update", id: "id", name: "new" }])).toBe(success);
  expect(await hooks.mutate("Moving", "Moved", [{ op: "update", id: "id", start: "09:00" }])).toBe(success);
});
it("a rejected row shows its own error", async () => {
  expect(await runMutation("Saving", "Saved", async () => ({ ok: true, data: { results: [errorRow] } }))).toEqual({
    ok: false,
    undoToken: null,
  });
  expect(mock.toast).toMatchObject({ title: "That time is already taken", message: "Time occupied" });
});
it("edit form refuses an end that is not after the start", async () => {
  const submit = vi.fn(async () => true);
  const tree = EditForm({ event, areas: [], activityTypes: [], onSubmit: submit });
  await tree.props.actions.props.children.props.onSubmit({ name: "work", end: new Date(2026, 8, 21, 22) });
  expect(submit).not.toHaveBeenCalled();
});
it("move form sends a lone start, so the server keeps the duration", async () => {
  const onMove = vi.fn(async () => true);
  const tree = MoveForm({ event, onMove });
  await tree.props.actions.props.children.props.onSubmit({ start: new Date(2026, 8, 22, 9) });
  expect(onMove).toHaveBeenCalledWith({ op: "update", id: "id", start: "2026-09-22T09:00" });
});
it("move form addresses an occurrence, later blocks, or the whole series", async () => {
  const occurrence = { ...event, id: "series@2026-09-21" };
  for (const [scope, expected] of [
    ["this", { id: "series@2026-09-21" }],
    ["future", { id: "series@2026-09-21", scope: "future" }],
  ] as const) {
    const onMove = vi.fn(async () => true);
    const tree = MoveForm({ event: occurrence, onMove });
    await tree.props.actions.props.children.props.onSubmit({ start: new Date(2026, 8, 21, 22), scope });
    expect(onMove).toHaveBeenCalledWith({ op: "update", ...expected, start: "2026-09-21T22:00" });
  }
});
it("a whole-series move and end edit apply to the series anchor, not the occurrence day", async () => {
  const occurrence = { ...event, id: "series@2026-09-21" };
  mock.rebase.mockResolvedValue({ ok: true, data: { start: "2026-09-01T22:00" } });
  const onMove = vi.fn(async () => true);
  const move = MoveForm({ event: occurrence, onMove });
  await move.props.actions.props.children.props.onSubmit({ start: new Date(2026, 8, 21, 22), scope: "all" });
  expect(mock.rebase).toHaveBeenCalledWith("series", expect.objectContaining({ start: "2026-09-21T23:00" }), {
    start: "2026-09-21T22:00",
  });
  expect(onMove).toHaveBeenCalledWith({ op: "update", id: "series", start: "2026-09-01T22:00" });

  mock.rebase.mockResolvedValue({ ok: true, data: { end: "2026-09-01T23:45" } });
  const onSubmit = vi.fn(async () => true);
  const edit = EditForm({ event: occurrence, areas: [], activityTypes: [], onSubmit });
  await edit.props.actions.props.children.props.onSubmit({
    name: "work",
    end: new Date(2026, 8, 21, 23, 45),
    scope: "all",
  });
  expect(onSubmit).toHaveBeenCalledWith({ op: "update", id: "series", end: "2026-09-01T23:45" });
});
it("sends an unlink with the other edits in one op, and no mirror field", async () => {
  mock.writable = [{ id: "work" }];
  mock.calendarFields = { calendarId: null, mirrorCalendarIds: [] };
  const submit = vi.fn(async () => true);
  const tree = EditForm({ event: { ...event, calendarId: "work" }, areas: [], activityTypes: [], onSubmit: submit });
  await tree.props.actions.props.children.props.onSubmit({
    name: "Renamed",
    end: new Date(2026, 8, 21, 23, 30),
    calendarId: "__none",
    mirrorIds: [],
  });
  // The server applies the edits, then the unlink, which also removes the mirrors.
  expect(submit).toHaveBeenCalledWith({ op: "update", id: "id", name: "Renamed", calendarId: null });
});
it("keeps the mirrors that the picker cannot show", async () => {
  mock.writable = [{ id: "work" }, { id: "home" }];
  mock.calendarFields = { mirrorCalendarIds: ["home"] };
  const submit = vi.fn(async () => true);
  const tree = EditForm({
    event: { ...event, calendarId: "work", mirrorCalendarIds: ["gone"] },
    areas: [],
    activityTypes: [],
    onSubmit: submit,
  });
  await tree.props.actions.props.children.props.onSubmit({ name: "work", end: new Date(2026, 8, 21, 23, 30) });
  expect(submit).toHaveBeenCalledWith({ op: "update", id: "id", mirrorCalendarIds: ["home", "gone"] });
});
it("offers the later-blocks choice for any occurrence id", () => {
  const tree = MoveForm({ event: { ...event, id: "series@2026-09-20" }, onMove: vi.fn() });
  const scope = tree.props.children.find((c: { props?: { id?: string } } | false) => c && c.props?.id === "scope");
  const values = [scope.props.children]
    .flat(2)
    .filter(Boolean)
    .map((i: { props: { value: string } }) => i.props.value);
  expect(values).toEqual(["this", "future", "all"]);
});
it("a successful Inbox save without an undo token is still successful", async () => {
  expect(await runMutation("Saving", "Saved", async () => ({ ok: true, data: { results: [okRow] } }))).toEqual({
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
it("choosing Unassigned clears the area with null", async () => {
  const submit = vi.fn(async () => true);
  const tree = EditForm({
    event: { ...event, areaId: "work" },
    areas: [{ id: "work", name: "Work", color: "#3b82f6" }],
    activityTypes: [],
    onSubmit: submit,
  });
  await tree.props.actions.props.children.props.onSubmit({
    name: "work",
    end: new Date(2026, 8, 21, 23, 30),
    areaId: "",
  });
  expect(submit).toHaveBeenCalledWith({ op: "update", id: "id", areaId: null });
});
it("editing only the name preserves hidden notes", async () => {
  const submit = vi.fn(async () => true);
  const tree = EditForm({
    event: { ...event, notes: "Keep these notes" },
    areas: [],
    activityTypes: [],
    onSubmit: submit,
  });
  await tree.props.actions.props.children.props.onSubmit({ name: "Renamed", end: new Date(2026, 8, 21, 23, 30) });
  expect(submit).toHaveBeenCalledWith({ op: "update", id: "id", name: "Renamed" });
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
  mock.result = { ok: true, data: { results: [{ index: 0, status: "ok" }], undoToken: "tok" } };
  const revalidate = vi.fn();
  const hooks = useAgendaMutations({ revalidate });
  await hooks.mutate("Saving", "Saved", [{ op: "update", id: "id", name: "new" }]);
  expect(revalidate).toHaveBeenCalledTimes(1); // mutate itself revalidates on success
  const action = (mock.toast as { primaryAction?: { onAction: (t: unknown) => Promise<void> } }).primaryAction;
  expect(action).toBeDefined();
  revalidate.mockClear();
  await action!.onAction(mock.toast);
  expect(mock.undo).toHaveBeenCalledWith(["tok"]);
  expect(revalidate).toHaveBeenCalled(); // toast Undo now revalidates the list
});

// runMutation threads onUndone to the toast Undo button. Covers the Inbox helper
// path (which the agenda mutate test above does not exercise) and guards that
// onUndone fires only when the revert succeeds.
it("runMutation fires onUndone after a successful toast Undo", async () => {
  const onUndone = vi.fn();
  mock.result = { ok: true, data: { results: [{ index: 0, status: "ok" }], undoToken: "tok" } };
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
  mock.result = { ok: true, data: { results: [{ index: 0, status: "ok" }], undoToken: "tok" } };
  mock.undo.mockResolvedValue({ ok: false, code: "network", message: "offline" });
  await runMutation("Scheduling…", "Scheduled the block", async () => mock.result, undefined, { onUndone });
  await (mock.toast as { primaryAction: { onAction: (t: unknown) => Promise<void> } }).primaryAction.onAction(
    mock.toast,
  );
  expect(mock.undo).toHaveBeenCalledWith(["tok"]);
  expect(onUndone).not.toHaveBeenCalled();
  // The server reason (for example, a sync in flight) tells the user to retry.
  expect(mock.toast).toMatchObject({ title: "Could not undo the change", message: "offline" });
});

function renderAgendaMutations(revalidate: () => void) {
  mock.stateful = true;
  mock.hookIndex = 0;
  return useAgendaMutations({ revalidate });
}

it("undoing an older toast preserves the newer panel undo", async () => {
  const revalidate = vi.fn();
  let hooks = renderAgendaMutations(revalidate);
  mock.result = { ok: true, data: { results: [{ index: 0, status: "ok" }], undoToken: "older" } };
  await hooks.mutate("Saving", "Saved", [{ op: "update", id: "id", name: "first" }]);
  const olderToast = mock.toast as { primaryAction: { onAction: (t: unknown) => Promise<void> } };
  mock.toast = {};
  mock.result = { ok: true, data: { results: [{ index: 0, status: "ok" }], undoToken: "newer" } };
  await hooks.mutate("Saving", "Saved", [{ op: "update", id: "id", name: "second" }]);
  await olderToast.primaryAction.onAction(olderToast);
  hooks = renderAgendaMutations(revalidate);
  expect(hooks.lastUndoToken).toBe("newer");
  await hooks.runUndo();
  expect(mock.undo.mock.calls).toEqual([[["older"]], [["newer"]]]);
});

it("panel and toast share in-flight and completed undo state", async () => {
  const revalidate = vi.fn();
  let hooks = renderAgendaMutations(revalidate);
  mock.result = { ok: true, data: { results: [{ index: 0, status: "ok" }], undoToken: "tok" } };
  await hooks.mutate("Saving", "Saved", [{ op: "update", id: "id", name: "new" }]);
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
  mock.result = { ok: true, data: { results: [{ index: 0, status: "ok" }], undoToken: "tok" } };
  await hooks.mutate("Saving", "Saved", [{ op: "update", id: "id", name: "new" }]);
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
    mock.result = { ok: true, data: { results: [{ index: 0, status: "ok" }], undoToken: "tok" } };
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
