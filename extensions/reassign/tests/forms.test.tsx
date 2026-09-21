import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  pop: vi.fn(),
  toast: {},
  result: { ok: true, data: { failed: 0 } } as {
    ok: boolean;
    data?: { failed: number };
    code?: string;
    message?: string;
  },
  signIn: vi.fn(),
  launch: vi.fn(),
  hud: vi.fn(),
  effects: [] as (() => void)[],
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (v: unknown) => [v, vi.fn()],
  useRef: (v: unknown) => ({ current: v }),
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
vi.mock("../src/lib/api", () => ({ updateEvent: async () => mock.result, eventsBatch: async () => mock.result }));
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
  mock.signIn.mockReset();
  mock.effects = [];
  mock.toast = {};
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
