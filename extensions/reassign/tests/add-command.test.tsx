import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { blockDraft, type AiPreview } from "../src/lib/ai-draft";

const mock = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  fullDays: new WeakSet<Date>(),
  capture: vi.fn(),
  create: vi.fn(),
  plan: vi.fn(),
  root: vi.fn(),
  push: vi.fn(),
}));
vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const slot = mock.cursor++;
    if (!(slot in mock.slots)) mock.slots[slot] = initial;
    return [
      mock.slots[slot],
      (value: unknown) => {
        mock.slots[slot] = typeof value === "function" ? value(mock.slots[slot]) : value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const slot = mock.cursor++;
    if (!(slot in mock.slots)) mock.slots[slot] = { current: initial };
    return mock.slots[slot];
  },
  useEffect: () => undefined,
}));
vi.mock("@raycast/api", () => ({
  Action: Object.assign("Action", { SubmitForm: "SubmitForm", Push: "Push" }),
  ActionPanel: "ActionPanel",
  Form: Object.assign("Form", {
    TextField: "TextField",
    TextArea: "TextArea",
    Description: "Description",
    Separator: "Separator",
    Checkbox: "Checkbox",
    Dropdown: Object.assign("Dropdown", { Item: "Item" }),
    DatePicker: Object.assign("DatePicker", {
      Type: { DateTime: "date_time" },
      isFullDay: (date: Date) => mock.fullDays.has(date),
    }),
  }),
  Icon: {},
  popToRoot: mock.root,
  useNavigation: () => ({ push: mock.push }),
  showToast: async () => ({}),
  Toast: { Style: {} },
}));
vi.mock("@raycast/utils", () => ({
  withAccessToken: () => (component: unknown) => component,
  useCachedPromise: () => ({ data: { ok: true, data: { areas: [], activityTypes: [] } } }),
}));
vi.mock("../src/lib/oauth", () => ({ reassignProvider: {} }));
vi.mock("../src/lib/api", () => ({ createEvent: mock.create, backlogCapture: mock.capture, planSchedule: mock.plan }));
vi.mock("../src/components/ai-fill-form", () => ({ AiFillForm: "AiFillForm" }));
vi.mock("../src/components/states", () => ({ refusalView: vi.fn() }));
vi.mock("../src/components/calendar-fields", () => ({
  useCalendars: () => ({ writable: [] }),
  calendarCreateFields: () => ({}),
  hasCalendarChange: () => false,
  CalendarFields: "CalendarFields",
  CALENDAR_DEFAULT: "",
}));
import AddCommand from "../src/add";

type Values = {
  name: string;
  start: Date | null;
  end: Date | null;
  duration: string;
  notes: string;
  areaId: string;
  activityTypeId: string;
  kind: string;
};
type Node = ReactElement<{
  id?: string;
  title?: string;
  value?: unknown;
  children?: unknown;
  actions?: unknown;
  onChange: (value: unknown) => void;
  onSubmit: (values: Values) => Promise<void>;
}>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions)];
}
function render(text = "") {
  mock.cursor = 0;
  return nodes(AddCommand({ arguments: { text } }));
}
const values: Values = {
  name: "idea",
  start: null,
  end: null,
  duration: "",
  notes: "",
  areaId: "",
  activityTypeId: "",
  kind: "blocking",
};
beforeEach(() => {
  mock.slots = [];
  mock.cursor = 0;
  mock.fullDays = new WeakSet();
  for (const fn of [mock.capture, mock.create, mock.root, mock.plan, mock.push]) fn.mockReset();
  mock.capture.mockResolvedValue({ ok: true, data: { failed: 0 } });
  mock.create.mockResolvedValue({ ok: true, data: { failed: 0 } });
});
it("blank Add Block opens with Save to Inbox as primary", () => {
  expect(render().find((n) => n.type === "SubmitForm")?.props.title).toBe("Save to Inbox");
});
it("uses native datetime pickers and shows duration until both boundaries have times", () => {
  render()
    .find((n) => n.props.id === "start")!
    .props.onChange(new Date(2026, 8, 22, 9));
  expect(render().find((n) => n.props.id === "duration")).toBeDefined();
  render()
    .find((n) => n.props.id === "end")!
    .props.onChange(new Date(2026, 8, 22, 11));
  expect(render().find((n) => n.props.id === "duration")).toBeUndefined();
  render()
    .find((n) => n.props.id === "end")!
    .props.onChange(null);
  expect(render().find((n) => n.props.id === "duration")!.props.value).toBe("2h");
});
it("a duration without times offers Find a Time", () => {
  render()
    .find((n) => n.props.id === "duration")!
    .props.onChange("90m");
  expect(render().find((n) => n.type === "SubmitForm")?.props.title).toBe("Find a Time");
});
it.each([
  ["deep work tomorrow 9am-11am", "09:00", "11:00", undefined],
  ["work tomorrow 11pm-1am", "23:00", "01:00", true],
])("submits the parsed boundaries for %s with hidden duration", async (text, start, end, endNextDay) => {
  const tree = render(text);
  await tree
    .find((n) => n.props.title === "Schedule Block")!
    .props.onSubmit({
      ...values,
      start: tree.find((n) => n.props.id === "start")!.props.value as Date,
      end: tree.find((n) => n.props.id === "end")!.props.value as Date,
    });
  expect(mock.create).toHaveBeenCalledWith(
    expect.objectContaining({ start, end, ...(endNextDay ? { endNextDay } : {}) }),
  );
  expect(mock.root).toHaveBeenCalledWith({ clearSearchBar: true });
});
it("keeps a failed draft and permits a corrected retry", async () => {
  mock.capture.mockResolvedValueOnce({ ok: false, code: "network", message: "offline" });
  const action = render().find((n) => n.props.title === "Save to Inbox")!;
  await action.props.onSubmit(values);
  expect(mock.root).not.toHaveBeenCalled();
  await action.props.onSubmit(values);
  expect(mock.root).toHaveBeenCalledTimes(1);
});
it("does not submit the same saved draft twice", async () => {
  const action = render().find((n) => n.props.title === "Save to Inbox")!;
  await Promise.all([action.props.onSubmit(values), action.props.onSubmit(values)]);
  await action.props.onSubmit(values);
  expect(mock.capture).toHaveBeenCalledTimes(1);
});
it("handles a replayed flexible commit", async () => {
  mock.plan.mockResolvedValue({
    ok: true,
    data: { committed: 1, results: [{ status: "ok", result: { status: "committed", event: { id: "new" } } }] },
  });
  await render()
    .find((n) => n.props.title === "Schedule Block")!
    .props.onSubmit({ ...values, duration: "90m" });
  expect(mock.root).toHaveBeenCalledTimes(1);
});
it("keeps hidden details when submitting the compact form", async () => {
  render()
    .find((n) => n.props.id === "showDetails")!
    .props.onChange(true);
  render()
    .find((n) => n.props.id === "notes")!
    .props.onChange("Keep this note");
  render()
    .find((n) => n.props.id === "showDetails")!
    .props.onChange(false);
  await render()
    .find((n) => n.props.title === "Save to Inbox")!
    .props.onSubmit({ name: "idea", start: null, end: null, duration: "" } as Values);
  expect(mock.capture).toHaveBeenCalledWith(expect.objectContaining({ notes: "Keep this note" }));
});
it("accepting AI only fills the draft and leaves saving explicit", () => {
  const action = render("work tomorrow 9am-11am").find((n) => n.props.title === "Fill with AI…")!;
  const target = (action.props as unknown as { target: ReactElement<{ onFill: (draft: unknown) => void }> }).target;
  target.props.onFill({
    name: "Read paper",
    start: null,
    duration: "90m",
    destination: "inbox",
    notes: "AI note",
    kind: "blocking",
    areaId: "",
    activityTypeId: "",
  });
  const filled = render("work tomorrow 9am-11am");
  expect(filled.find((n) => n.props.id === "name")!.props.value).toBe("Read paper");
  expect(filled.find((n) => n.props.id === "notes")!.props.value).toBe("AI note");
  expect(filled.find((n) => n.type === "SubmitForm")!.props.title).toBe("Save to Inbox");
  expect(mock.create).not.toHaveBeenCalled();
  expect(mock.capture).not.toHaveBeenCalled();
});
it("native full-day picker input stays in Inbox, not an event at midnight", async () => {
  const date = new Date(2026, 8, 22);
  mock.fullDays.add(date);
  render()
    .find((n) => n.props.id === "start")!
    .props.onChange(date);
  const action = render().find((n) => n.type === "SubmitForm")!;
  expect(action.props.title).toBe("Save to Inbox");
  await action.props.onSubmit({ ...values, start: date });
  expect(mock.capture).toHaveBeenCalledWith(expect.objectContaining({ plannedDate: "2026-09-22" }));
  expect(mock.create).not.toHaveBeenCalled();
});
it("date-only launch text keeps its planned date without a scheduled event", async () => {
  const tree = render("read tomorrow");
  await tree.find((n) => n.type === "SubmitForm")!.props.onSubmit(values);
  expect(mock.capture.mock.calls[0][0].plannedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(mock.create).not.toHaveBeenCalled();
});
it("does not schedule full-day input without a duration", async () => {
  const date = new Date(2026, 8, 22);
  mock.fullDays.add(date);
  await render()
    .find((n) => n.props.title === "Schedule Block")!
    .props.onSubmit({ ...values, start: date });
  expect(mock.create).not.toHaveBeenCalled();
  expect(mock.root).not.toHaveBeenCalled();
});
it("duration-only scheduling requests concrete proposals without auto-commit", async () => {
  mock.plan.mockResolvedValue({ ok: true, data: { committed: 0, results: [] } });
  const date = new Date(2026, 8, 22);
  mock.fullDays.add(date);
  await render()
    .find((n) => n.props.title === "Schedule Block")!
    .props.onSubmit({ ...values, start: date, duration: "90m" });
  expect(mock.plan).toHaveBeenCalledWith([
    expect.objectContaining({ duration: "90m", date: "2026-09-22", autoCommitBest: false }),
  ]);
  expect(mock.create).not.toHaveBeenCalled();
  expect(mock.root).not.toHaveBeenCalled();
});
it("derives a start from end plus duration", async () => {
  await render()
    .find((n) => n.props.title === "Schedule Block")!
    .props.onSubmit({ ...values, end: new Date(2026, 8, 22, 11), duration: "90m" });
  expect(mock.create).toHaveBeenCalledWith(
    expect.objectContaining({ date: "2026-09-22", start: "09:30", end: "11:00" }),
  );
});
afterEach(() => vi.useRealTimers());

it.each([
  ["lunch tomorrow", "2026-09-23"],
  ["lunch", undefined],
])("AI inbox draft preserves only an explicit planned date from %s", async (text, expectedDate) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 22, 12));
  const preview: AiPreview = {
    applied: false,
    intents: [{ op: "park", name: "Lunch", durationHours: 1 }],
  };
  const draft = blockDraft(preview);
  expect(draft.destination).toBe("inbox");
  expect(draft.start).toBeNull();

  const tree = render(text);
  const fillAction = tree.find((n) => n.props.title === "Fill with AI…")!;
  const target = (fillAction.props as unknown as { target: ReactElement<{ onFill: (draft: unknown) => void }> }).target;
  target.props.onFill(draft);
  const filled = render(text);
  await filled.find((n) => n.type === "SubmitForm")!.props.onSubmit(values);
  const captured = mock.capture.mock.calls[0][0];
  expect(captured.plannedDate).toBe(expectedDate);
});

it("AI schedule followed by Inbox retains the newly chosen date", async () => {
  const scheduled = blockDraft({
    applied: false,
    intents: [{ op: "create", name: "Lunch", date: "2026-10-12", start: "12:00", end: "13:00" }],
  });
  const parked = blockDraft({ applied: false, intents: [{ op: "park", name: "Lunch" }] });
  function fill(draft: unknown) {
    const action = render("lunch tomorrow").find((n) => n.props.title === "Fill with AI…")!;
    const target = (action.props as unknown as { target: ReactElement<{ onFill: (draft: unknown) => void }> }).target;
    target.props.onFill(draft);
  }
  fill(scheduled);
  fill(parked);
  await render("lunch tomorrow")
    .find((n) => n.props.title === "Save to Inbox")!
    .props.onSubmit(values);
  expect(mock.capture.mock.calls[0][0].plannedDate).toBe("2026-10-12");
});
