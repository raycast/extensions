import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ApiResult } from "../src/lib/api";
const mock = vi.hoisted(() => ({
  writable: [] as { id: string }[],
  calendarFields: {} as Record<string, unknown>,
  pop: vi.fn(),
  stateful: false,
  hookIndex: 0,
  hookValues: [] as unknown[],
  toast: {},
  result: { ok: true, data: { results: [{ index: 0, status: "ok" }] } } as ApiResult<{
    results: { index: number; status: string; error?: { code: string; message: string } }[];
    undoToken?: string;
  }>,
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
import { ScopeDropdown } from "../src/components/scope-dropdown";
import { BacklogScheduleForm } from "../src/components/backlog-schedule-form";
import { useAgendaMutations } from "../src/components/agenda-actions";
import { refusalView } from "../src/components/states";
import { runMutation } from "../src/lib/feedback";
import { isoToDate } from "../src/lib/format";
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
afterEach(() => {
  vi.useRealTimers();
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
    const tree = BacklogScheduleForm({
      item: { id: "id", name: "idea" },
      todayIso: "2026-09-22",
      onSubmit: async () => success,
    });
    await tree.props.actions.props.children.props.onSubmit({ date: new Date(2026, 8, 22), start: "09:00" });
    expect(mock.pop).toHaveBeenCalledTimes(success ? 1 : 0);
  });
}
const okRow = { index: 0, status: "ok" };
const errorRow = { index: 0, status: "error", error: { code: "conflict", message: "Time occupied" } };
it.each<typeof mock.result>([
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
// The contract says a batch whose writes landed is never rejected. A failed
// read-back row keeps the undo receipt, so the save is a success with Undo.
it("a landed write with a failed read-back row keeps success and Undo", async () => {
  const readBack = { index: 0, status: "error", error: { code: "internal", message: "Read-back failed" } };
  mock.result = { ok: true, data: { results: [readBack], undoToken: "u1" } };
  expect(await runMutation("Saving", "Saved", async () => mock.result)).toEqual({ ok: true, undoToken: "u1" });
  expect(mock.toast).toMatchObject({ style: "success", title: "Saved", message: "Refresh to see the change." });
  expect((mock.toast as { primaryAction?: unknown }).primaryAction).toBeDefined();
});
it("a failed read-back row with no undo receipt still counts as landed", async () => {
  const readBack = { index: 0, status: "error", error: { code: "internal", message: "Read-back failed" } };
  const result = { ok: true as const, data: { results: [readBack] } };
  expect(await runMutation("Saving", "Saved", async () => result)).toEqual({ ok: true, undoToken: null });
  expect(mock.toast).toMatchObject({ style: "success", message: "Refresh to see the change." });
});
it("a 2xx with an ok row and an error row counts as landed", async () => {
  const result = { ok: true as const, data: { results: [okRow, { ...errorRow, index: 1 }] } };
  expect(await runMutation("Saving", "Saved", async () => result)).toEqual({ ok: true, undoToken: null });
  expect(mock.toast).toMatchObject({ style: "success", title: "Saved" });
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

// Regression: the early "nothing changed — pop" guard used to fire before the
// scope was considered, so an unchanged-start "Every block in the series"
// submit on a previously-moved occurrence popped before rebaseOnSeries could
// run — silently dropping the user's intended re-anchor. The guard now bypasses
// "all" and lets rebaseOnSeries decide whether the write is a true no-op
// (rebased start equals the anchor's current start).
it("scope=all on a day-moved occurrence re-anchors the series with the unchanged start", async () => {
  mock.rebase.mockReset();
  mock.rebase.mockResolvedValue({ ok: true, data: { start: "2026-09-02T14:00", anchorStart: "2026-09-01T09:00" } });
  const onMove = vi.fn(async () => true);
  const tree = MoveForm({
    event: { id: "series@2026-09-21", name: "workout", start: "2026-09-22T14:00", end: "2026-09-22T15:00" },
    onMove,
  });
  await tree.props.actions.props.children.props.onSubmit({ start: new Date(2026, 8, 22, 14, 0), scope: "all" });
  expect(mock.rebase).toHaveBeenCalledWith(
    "series",
    expect.objectContaining({ start: "2026-09-22T14:00", date: "2026-09-21" }),
    { start: "2026-09-22T14:00" },
  );
  expect(onMove).toHaveBeenCalledWith({ op: "update", id: "series", start: "2026-09-02T14:00" });
  expect(mock.pop).toHaveBeenCalledTimes(1);
});

it("scope=all on a clock-moved occurrence re-anchors the series with the unchanged start", async () => {
  mock.rebase.mockReset();
  mock.rebase.mockResolvedValue({ ok: true, data: { start: "2026-09-01T14:00", anchorStart: "2026-09-01T09:00" } });
  const onMove = vi.fn(async () => true);
  const tree = MoveForm({
    event: { id: "series@2026-09-01", name: "workout", start: "2026-09-01T14:00", end: "2026-09-01T15:00" },
    onMove,
  });
  await tree.props.actions.props.children.props.onSubmit({ start: new Date(2026, 8, 1, 14, 0), scope: "all" });
  // The rebased start equals the submitted start (days = 0), but the anchor's
  // clock still needs to change from 09:00 to 14:00 — the write must fire.
  expect(mock.rebase).toHaveBeenCalledWith(
    "series",
    expect.objectContaining({ start: "2026-09-01T14:00", date: "2026-09-01" }),
    { start: "2026-09-01T14:00" },
  );
  expect(onMove).toHaveBeenCalledWith({ op: "update", id: "series", start: "2026-09-01T14:00" });
  expect(mock.pop).toHaveBeenCalledTimes(1);
});

it("scope=all with an unchanged start skips the write when the anchor is already aligned", async () => {
  mock.rebase.mockReset();
  mock.rebase.mockResolvedValue({ ok: true, data: { start: "2026-09-01T09:00", anchorStart: "2026-09-01T09:00" } });
  const onMove = vi.fn(async () => true);
  const tree = MoveForm({
    event: { id: "series@2026-09-01", name: "workout", start: "2026-09-01T09:00", end: "2026-09-01T10:00" },
    onMove,
  });
  await tree.props.actions.props.children.props.onSubmit({ start: new Date(2026, 8, 1, 9, 0), scope: "all" });
  expect(mock.rebase).toHaveBeenCalledTimes(1);
  expect(onMove).not.toHaveBeenCalled();
  expect(mock.pop).toHaveBeenCalledTimes(1);
});

it.each(["this", "future"] as const)("scope=%s with an unchanged start pops without a round-trip", async (scope) => {
  mock.rebase.mockReset();
  const onMove = vi.fn(async () => true);
  const tree = MoveForm({
    event: { id: "series@2026-09-01", name: "workout", start: "2026-09-01T09:00", end: "2026-09-01T10:00" },
    onMove,
  });
  await tree.props.actions.props.children.props.onSubmit({ start: new Date(2026, 8, 1, 9, 0), scope });
  expect(mock.rebase).not.toHaveBeenCalled();
  expect(onMove).not.toHaveBeenCalled();
  expect(mock.pop).toHaveBeenCalledTimes(1);
});

it("scope=all surfacing a rebase failure shows the error and does not pop or write", async () => {
  mock.rebase.mockReset();
  mock.rebase.mockResolvedValue({
    ok: false,
    code: "not_found",
    message: "The series was not found. Edit it in Reassign.",
  });
  const onMove = vi.fn(async () => true);
  const tree = MoveForm({
    event: { id: "series@2026-09-21", name: "workout", start: "2026-09-22T14:00", end: "2026-09-22T15:00" },
    onMove,
  });
  await tree.props.actions.props.children.props.onSubmit({ start: new Date(2026, 8, 22, 14, 0), scope: "all" });
  expect(mock.rebase).toHaveBeenCalledTimes(1);
  expect(onMove).not.toHaveBeenCalled();
  expect(mock.pop).not.toHaveBeenCalled();
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
  expect(tree.props.children).toContainEqual(expect.objectContaining({ type: ScopeDropdown }));
  const scope = ScopeDropdown();
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

it("a scope refusal offers a manual sign-in, not a retry of the same request", async () => {
  mock.effects = [];
  mock.signIn.mockReset();
  mock.signIn.mockResolvedValue(undefined);
  const onRecover = vi.fn();
  const element = refusalView({ ok: false, code: "scope", message: "Missing scope" }, onRecover);
  const tree = (element.type as (props: unknown) => ReactElementLike)(element.props);
  mock.effects.forEach((fn) => fn());
  expect(mock.signIn).not.toHaveBeenCalled();
  const action = tree.props.children.props.actions.props.children;
  expect(action.props.title).toBe("Sign in to Reassign");
  await action.props.onAction();
  expect(mock.signIn).toHaveBeenCalledTimes(1);
  expect(onRecover).toHaveBeenCalledTimes(1);
});
type ReactElementLike = {
  props: {
    children: {
      props: { actions: { props: { children: { props: { title: string; onAction: () => Promise<void> } } } } };
    };
  };
};

it("Now offers foreground sign-in and reports a failed launch", async () => {
  mock.launch.mockRejectedValueOnce(new Error("cannot launch"));
  mock.hud.mockClear();
  const tree = NowCommand();
  const signInItem = tree.props.children.find(
    (child: { props?: { title?: string } } | false) => child && child.props?.title === "Sign in to Reassign",
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
  const tree = BacklogScheduleForm({ item: { id: "id", name: "idea" }, todayIso: "2026-09-22", onSubmit: submit });
  await tree.props.actions.props.children.props.onSubmit({ date: new Date(), start: "25:99" });
  expect(submit).not.toHaveBeenCalled();
  expect(mock.pop).not.toHaveBeenCalled();
});

// Regression: an unplanned Inbox idea (no `plannedDate`) opened on the *device*
// clock (`todayISO()`) even though every "Today"/"Tomorrow" label in the
// surrounding Inbox is derived from the account `now` (`nowWallClock(now).date`).
// When the device and account timezones straddle midnight, the form prefilled
// the account's tomorrow and a no-edit submit landed the block on the wrong
// account day. The fix threads the account `todayIso` into the form so the
// default-date basis matches the labelling basis.
it("defaults an unplanned idea to the account today, not the device clock", () => {
  vi.useFakeTimers();
  // Device already on 2026-09-23; the account (passed via todayIso) is 2026-09-22.
  vi.setSystemTime(new Date(2026, 8, 23, 9, 0));
  const tree = BacklogScheduleForm({
    item: { id: "id", name: "bare idea" },
    todayIso: "2026-09-22",
    onSubmit: async () => true,
  }) as { props: { children: { props: { id?: string; defaultValue?: Date } }[] } };
  const date = tree.props.children.find((c) => c?.props?.id === "date")!;
  expect(date.props.defaultValue).toEqual(isoToDate("2026-09-22")); // account today
  expect(date.props.defaultValue).not.toEqual(isoToDate("2026-09-23")); // device today
});

it("defaults a planned idea to its plannedDate over the account today", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 23, 9, 0));
  const tree = BacklogScheduleForm({
    item: { id: "id", name: "planned idea", plannedDate: "2026-09-25" },
    todayIso: "2026-09-22",
    onSubmit: async () => true,
  }) as { props: { children: { props: { id?: string; defaultValue?: Date } }[] } };
  const date = tree.props.children.find((c) => c?.props?.id === "date")!;
  expect(date.props.defaultValue).toEqual(isoToDate("2026-09-25"));
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

it.each(["toast", "panel"])("keeps both Undo actions after a stale refusal from the %s", async (from) => {
  const revalidate = vi.fn();
  let hooks = renderAgendaMutations(revalidate);
  mock.result = { ok: true, data: { results: [{ index: 0, status: "ok" }], undoToken: "tok" } };
  await hooks.mutate("Shifting", "Shifted", [{ op: "shift", id: "id", byMinutes: 60 }]);
  hooks = renderAgendaMutations(revalidate);
  revalidate.mockClear();
  const toast = mock.toast as { primaryAction?: { onAction: (t: unknown) => Promise<void> }; title: string };
  mock.undo.mockResolvedValueOnce({ ok: false, code: "stale", message: "A newer change touched it." });

  if (from === "toast") await toast.primaryAction!.onAction(toast);
  else await hooks.runUndo();

  hooks = renderAgendaMutations(revalidate);
  expect(hooks.lastUndoToken).toBe("tok");
  expect(toast.primaryAction).toBeDefined();
  expect(toast.title).toBe("The block changed since then");
  expect(revalidate).not.toHaveBeenCalled();

  // The newer edit is undone elsewhere; retry through the other action.
  if (from === "toast") await hooks.runUndo();
  else await toast.primaryAction!.onAction(toast);

  hooks = renderAgendaMutations(revalidate);
  expect(mock.undo.mock.calls).toEqual([[["tok"]], [["tok"]]]);
  expect(hooks.lastUndoToken).toBeNull();
  expect(toast.primaryAction).toBeUndefined();
  expect(toast.title).toBe("Undid the change");
  expect(revalidate).toHaveBeenCalledTimes(1);
  await hooks.runUndo();
  expect(mock.undo).toHaveBeenCalledTimes(2);
});

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
