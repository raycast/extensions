import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { blockDraft, type AiPreview } from "../src/lib/ai-draft";
import { addDaysISO, todayISO } from "../src/lib/format";

const mock = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  fullDays: new WeakSet<Date>(),
  capture: vi.fn(),
  create: vi.fn(),
  plan: vi.fn(),
  confirm: vi.fn(),
  calendar: {} as Record<string, unknown>,
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
  List: Object.assign("List", { Item: "ListItem" }),
  popToRoot: mock.root,
  useNavigation: () => ({ push: mock.push }),
  showToast: async () => ({ hide: async () => undefined }),
  Toast: { Style: {} },
}));
vi.mock("@raycast/utils", () => ({
  withAccessToken: () => (component: unknown) => component,
  useCachedPromise: () => ({ data: { ok: true, data: { areas: [], activityTypes: [] } } }),
}));
vi.mock("../src/lib/oauth", () => ({ reassignProvider: {} }));
// `mock.create` sees the single create op that the command sends to POST /events.
vi.mock("../src/lib/api", () => ({
  getSchedule: vi.fn(),
  writeEvents: (ops: unknown[]) => mock.create(ops[0]),
  backlogCaptureText: mock.capture,
  planSchedule: mock.plan,
  confirmSchedule: mock.confirm,
}));
vi.mock("../src/components/ai-fill-form", () => ({ AiFillForm: "AiFillForm" }));
vi.mock("../src/components/states", () => ({ refusalView: vi.fn() }));
vi.mock("../src/components/calendar-fields", () => ({
  useCalendars: () => ({ writable: [] }),
  calendarCreateFields: () => mock.calendar,
  hasCalendarChange: (fields: Record<string, unknown>) => Object.keys(fields).length > 0,
  CalendarFields: "CalendarFields",
  CALENDAR_DEFAULT: "",
}));
import AddCommand, { clockOffsetOf, planWindow } from "../src/add";

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
  mock.calendar = {};
  for (const fn of [mock.capture, mock.create, mock.root, mock.plan, mock.confirm, mock.push]) fn.mockReset();
  mock.capture.mockResolvedValue({
    ok: true,
    data: { results: [{ index: 0, status: "ok", result: { created: [{ id: "b1", name: "idea" }], source: "ai" } }] },
  });
  mock.create.mockResolvedValue({ ok: true, data: { results: [{ index: 0, status: "ok" }] } });
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
  ["deep work tomorrow 9am-11am", "09:00", "11:00", 0],
  ["work tomorrow 11pm-1am", "23:00", "01:00", 1],
])("submits the parsed boundaries for %s with hidden duration", async (text, start, end, endDays) => {
  const tree = render(text);
  await tree
    .find((n) => n.props.title === "Schedule Block")!
    .props.onSubmit({
      ...values,
      start: tree.find((n) => n.props.id === "start")!.props.value as Date,
      end: tree.find((n) => n.props.id === "end")!.props.value as Date,
    });
  // Both bounds are local datetimes; an overnight end carries the next day's date.
  const tomorrow = addDaysISO(todayISO(), 1);
  expect(mock.create).toHaveBeenCalledWith({
    op: "create",
    name: expect.any(String),
    kind: "blocking",
    start: `${tomorrow}T${start}`,
    end: `${addDaysISO(tomorrow, endDays)}T${end}`,
  });
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
    data: { undoToken: "undo", results: [{ index: 0, status: "ok", result: { event: { id: "new" } } }] },
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
it("saves the chosen type with an Inbox idea", async () => {
  await render()
    .find((n) => n.props.title === "Save to Inbox")!
    .props.onSubmit({ ...values, kind: "reference" });
  expect(mock.capture).toHaveBeenCalledWith(expect.objectContaining({ kind: "reference" }));
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
it("an AI home calendar keeps the mirrors the user chose, apart from that calendar", () => {
  render()
    .find((n) => n.props.id === "showDetails")!
    .props.onChange(true);
  const picker = render().find((n) => n.type === "CalendarFields")! as unknown as ReactElement<{
    onChange: (values: { calendarId: string; mirrorIds: string[] }) => void;
  }>;
  picker.props.onChange({ calendarId: "", mirrorIds: ["home", "work"] });
  const action = render().find((n) => n.props.title === "Fill with AI…")!;
  const target = (action.props as unknown as { target: ReactElement<{ onFill: (draft: unknown) => void }> }).target;
  target.props.onFill({
    name: "Standup",
    start: new Date(2026, 8, 22, 9),
    duration: "30m",
    destination: "schedule",
    notes: "",
    kind: "blocking",
    areaId: "",
    activityTypeId: "",
    calendarId: "work",
  });
  const filled = render().find((n) => n.type === "CalendarFields")! as unknown as ReactElement<{
    calendarDefault: string;
    mirrorDefault: string[];
  }>;
  expect(filled.props.calendarDefault).toBe("work");
  expect(filled.props.mirrorDefault).toEqual(["home"]);
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
  expect(mock.capture).toHaveBeenCalledWith({ op: "capture_text", text: "idea", plannedDate: "2026-09-22" });
  expect(mock.create).not.toHaveBeenCalled();
});
it("date-only launch text goes to the Inbox AI as raw text, without a parsed planned date", async () => {
  const tree = render("read tomorrow");
  const name = tree.find((n) => n.props.id === "name")!.props.value as string;
  await tree.find((n) => n.type === "SubmitForm")!.props.onSubmit({ ...values, name });
  // The AI reads the day from the text. A parsed day is not a user choice.
  expect(mock.capture).toHaveBeenCalledWith({ op: "capture_text", text: "read tomorrow" });
  expect(mock.create).not.toHaveBeenCalled();
});
it("sends the whole launch text and no default field to the Inbox AI", async () => {
  const text = "buy milk and call mom tomorrow 30m";
  const tree = render(text);
  await tree
    .find((n) => n.props.title === "Save to Inbox")!
    .props.onSubmit({
      ...values,
      name: tree.find((n) => n.props.id === "name")!.props.value as string,
      duration: tree.find((n) => n.props.id === "duration")!.props.value as string,
    });
  // A parsed duration, a parsed day and the default type stay with the AI.
  expect(mock.capture).toHaveBeenCalledWith({ op: "capture_text", text });
});
it("a start time alone sends its day, but not the default 30-minute length", async () => {
  const start = new Date(2026, 8, 22, 9);
  render()
    .find((n) => n.props.id === "start")!
    .props.onChange(start);
  await render()
    .find((n) => n.props.title === "Save to Inbox")!
    .props.onSubmit({ ...values, start });
  expect(mock.capture).toHaveBeenCalledWith({ op: "capture_text", text: "idea", plannedDate: "2026-09-22" });
});
it("a chosen end time sends the range length", async () => {
  const start = new Date(2026, 8, 22, 9);
  const end = new Date(2026, 8, 22, 11);
  const tree = render();
  tree.find((n) => n.props.id === "start")!.props.onChange(start);
  render()
    .find((n) => n.props.id === "end")!
    .props.onChange(end);
  await render()
    .find((n) => n.props.title === "Save to Inbox")!
    .props.onSubmit({ ...values, start, end });
  expect(mock.capture).toHaveBeenCalledWith({
    op: "capture_text",
    text: "idea",
    plannedDate: "2026-09-22",
    durationMinutes: 120,
  });
});
it("an edited name replaces the launch text", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 22, 12));
  await render("read tomorrow")
    .find((n) => n.props.title === "Save to Inbox")!
    .props.onSubmit({ ...values, name: "  Read the paper  " });
  // The new text lost "tomorrow", so the parsed day goes as a field.
  expect(mock.capture).toHaveBeenCalledWith({ op: "capture_text", text: "Read the paper", plannedDate: "2026-09-23" });
});
it("a cleared duration does not send the 30-minute default", async () => {
  const start = new Date(2026, 8, 22, 9);
  render()
    .find((n) => n.props.id === "start")!
    .props.onChange(start);
  render()
    .find((n) => n.props.id === "duration")!
    .props.onChange("1h");
  render()
    .find((n) => n.props.id === "duration")!
    .props.onChange("");
  await render()
    .find((n) => n.props.title === "Save to Inbox")!
    .props.onSubmit({ ...values, start });
  expect(mock.capture).toHaveBeenCalledWith({ op: "capture_text", text: "idea", plannedDate: "2026-09-22" });
});
it("sends a duration that the user typed", async () => {
  render()
    .find((n) => n.props.id === "duration")!
    .props.onChange("45m");
  const tree = render();
  // A duration alone makes Find a Time the primary action; Save to Inbox stays.
  await tree.find((n) => n.props.title === "Save to Inbox")!.props.onSubmit({ ...values, duration: "45m" });
  expect(mock.capture).toHaveBeenCalledWith({ op: "capture_text", text: "idea", durationMinutes: 45 });
});
it("sends a multi-line name as one capture and closes the form", async () => {
  mock.capture.mockResolvedValueOnce({
    ok: true,
    data: {
      undoToken: "undo",
      results: [
        { index: 0, status: "ok", result: { created: [{ name: "Buy milk" }, { name: "Call mom" }], source: "ai" } },
      ],
    },
  });
  await render()
    .find((n) => n.props.title === "Save to Inbox")!
    .props.onSubmit({ ...values, name: "Buy milk\nCall mom" });
  expect(mock.capture).toHaveBeenCalledWith({ op: "capture_text", text: "Buy milk\nCall mom" });
  expect(mock.root).toHaveBeenCalledTimes(1);
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
  mock.plan.mockResolvedValue({ ok: true, data: { results: [] } });
  const date = new Date(2026, 8, 22);
  mock.fullDays.add(date);
  await render()
    .find((n) => n.props.title === "Schedule Block")!
    .props.onSubmit({ ...values, start: date, duration: "90m" });
  expect(mock.plan).toHaveBeenCalledWith([
    expect.objectContaining({
      durationMinutes: 90,
      earliest: "2026-09-22T08:00",
      latest: "2026-09-22T22:00",
      autoCommitBest: false,
    }),
  ]);
  expect(mock.create).not.toHaveBeenCalled();
  expect(mock.root).not.toHaveBeenCalled();
});
it("derives a start from end plus duration", async () => {
  await render()
    .find((n) => n.props.title === "Schedule Block")!
    .props.onSubmit({ ...values, end: new Date(2026, 8, 22, 11), duration: "90m" });
  expect(mock.create).toHaveBeenCalledWith(
    expect.objectContaining({ start: "2026-09-22T09:30", end: "2026-09-22T11:00" }),
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
    intents: [{ op: "park", name: "Lunch", durationMinutes: 60 }],
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

it("an AI park draft preserves the typed time window when Find a Time runs", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 22, 12));
  mock.plan.mockResolvedValue({ ok: true, data: { results: [] } });
  const text = "lunch tomorrow 60m in the evening";
  const draft = blockDraft({ intents: [{ op: "park", name: "Lunch", durationMinutes: 60 }] });
  expect(draft.destination).toBe("inbox");
  expect(draft.start).toBeNull();

  const tree = render(text);
  const fillAction = tree.find((n) => n.props.title === "Fill with AI…")!;
  const target = (fillAction.props as unknown as { target: ReactElement<{ onFill: (d: unknown) => void }> }).target;
  target.props.onFill(draft);
  const filled = render(text);
  await filled
    .find((n) => n.props.title === "Find a Time")!
    .props.onSubmit({
      ...values,
      name: "Lunch",
      duration: "60m",
    });
  expect(mock.plan).toHaveBeenCalledTimes(1);
  expect(mock.plan).toHaveBeenCalledWith([
    expect.objectContaining({
      durationMinutes: 60,
      earliest: "2026-09-23T17:00",
      latest: "2026-09-23T21:00",
      autoCommitBest: false,
    }),
  ]);
  expect(mock.capture).not.toHaveBeenCalled();
  expect(mock.create).not.toHaveBeenCalled();
});

it("AI schedule followed by Inbox retains the newly chosen date", async () => {
  const scheduled = blockDraft({
    intents: [{ op: "create", name: "Lunch", start: "2026-10-12T12:00", end: "2026-10-12T13:00" }],
  });
  const parked = blockDraft({ intents: [{ op: "park", name: "Lunch" }] });
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

it("moves a window that has passed today to the same window tomorrow", () => {
  const evening = new Date(2026, 8, 22, 22, 30);
  expect(planWindow("2026-09-22", undefined, undefined, evening)).toEqual({
    earliest: "2026-09-23T08:00",
    latest: "2026-09-23T22:00",
    nextDay: true,
  });
  // A window that is still open today, and any other day, stay as they are.
  expect(planWindow("2026-09-22", undefined, undefined, new Date(2026, 8, 22, 12))).toMatchObject({
    earliest: "2026-09-22T08:00",
    nextDay: false,
  });
  expect(planWindow("2026-09-25", "06:00", "12:00", evening)).toMatchObject({
    earliest: "2026-09-25T06:00",
    nextDay: false,
  });
});
it("refuses a scheduled name over the server limit before it sends anything", async () => {
  await render()
    .find((n) => n.props.title === "Schedule Block")!
    .props.onSubmit({ ...values, name: "x".repeat(201), end: new Date(2026, 8, 22, 11), duration: "90m" });
  expect(mock.create).not.toHaveBeenCalled();
});
it("the Inbox sends a long name as AI text, and refuses notes over the limit", async () => {
  const action = render().find((n) => n.props.title === "Save to Inbox")!;
  await action.props.onSubmit({ ...values, name: "x".repeat(201), notes: "n".repeat(2001) });
  expect(mock.capture).not.toHaveBeenCalled();
  await action.props.onSubmit({ ...values, name: "x".repeat(201) });
  expect(mock.capture).toHaveBeenCalledWith({ op: "capture_text", text: "x".repeat(201) });
});

it("routes a recurring capture to the web and sends no write", () => {
  const tree = render("gym every monday 7am");
  expect(tree.some((n) => n.type === "SubmitForm")).toBe(false);
  expect(tree.find((n) => n.type === "Description")?.props.title).toBe("Repeating blocks");
  expect(mock.create).not.toHaveBeenCalled();
  expect(mock.capture).not.toHaveBeenCalled();
  expect(mock.plan).not.toHaveBeenCalled();
});

// ProposalsList: the pushed slot picker for a flexible block.
const NOON = new Date(2026, 8, 22, 12);
function proposals(token: string, expiresAt: Date) {
  const result = {
    commitToken: token,
    expiresAt: expiresAt.toISOString(),
    options: [{ start: "2026-09-22T14:00", end: "2026-09-22T15:30" }],
  };
  return { ok: true, data: { results: [{ index: 0, status: "ok", result }] } };
}
const booked = {
  ok: true,
  data: { undoToken: "undo", results: [{ index: 0, status: "ok", result: { event: { id: "ev1" } } }] },
};

/** Submit a duration-only block and give the slot action of the pushed list. */
async function openProposals(expiresAt: Date) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOON);
  mock.plan.mockResolvedValueOnce(proposals("tok-1", expiresAt));
  await render()
    .find((n) => n.props.title === "Schedule Block")!
    .props.onSubmit({ ...values, duration: "90m" });
  const list = mock.push.mock.calls[0][0] as ReactElement<Record<string, unknown>>;
  // The list keeps its own hook slots, apart from the form.
  mock.slots = [];
  return () => {
    mock.cursor = 0;
    const tree = nodes((list.type as (props: unknown) => unknown)(list.props));
    const action = tree.find((n) => n.props.title === "Use This Slot")!;
    return (action.props as unknown as { onAction: () => Promise<void> }).onAction;
  };
}

it("re-plans instead of sending an expired commit token", async () => {
  const slot = await openProposals(new Date(NOON.getTime() - 60_000));
  mock.plan.mockResolvedValueOnce(proposals("tok-2", new Date(NOON.getTime() + 600_000)));
  await slot()();
  expect(mock.confirm).not.toHaveBeenCalled();
  expect(mock.plan).toHaveBeenCalledTimes(2);
  const [first, second] = mock.plan.mock.calls.map((call) => call[0][0]);
  expect(second.requestId).not.toBe(first.requestId);
  expect(second.autoCommitBest).toBe(false);

  // The fresh proposals replace the stale ones, so the next pick sends the new token.
  mock.confirm.mockResolvedValueOnce(booked);
  await slot()();
  expect(mock.confirm).toHaveBeenCalledWith([{ token: "tok-2", choice: 0 }]);
  expect(mock.root).toHaveBeenCalledTimes(1);
});

it("re-plans when the server refuses the token with not_found", async () => {
  const slot = await openProposals(new Date(NOON.getTime() + 600_000));
  mock.confirm.mockResolvedValueOnce({ ok: false, code: "not_found", message: "gone" });
  mock.plan.mockResolvedValueOnce(proposals("tok-2", new Date(NOON.getTime() + 600_000)));
  await slot()();
  expect(mock.confirm).toHaveBeenCalledWith([{ token: "tok-1", choice: 0 }]);
  expect(mock.plan).toHaveBeenCalledTimes(2);
  expect(mock.root).not.toHaveBeenCalled();
});

it("sends one commit for a double tap on a slot", async () => {
  const slot = await openProposals(new Date(NOON.getTime() + 600_000));
  let answer: (value: unknown) => void = () => undefined;
  mock.confirm.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
  const pick = slot();
  const taps = Promise.all([pick(), pick()]);
  await vi.waitFor(() => expect(mock.confirm).toHaveBeenCalledTimes(1));
  answer(booked);
  await taps;
  expect(mock.confirm).toHaveBeenCalledTimes(1);
  expect(mock.root).toHaveBeenCalledTimes(1);
});

it("a committed slot applies the chosen calendar, then closes the form", async () => {
  mock.calendar = { calendarId: "work" };
  const slot = await openProposals(new Date(NOON.getTime() + 600_000));
  mock.confirm.mockResolvedValueOnce(booked);
  await slot()();
  expect(mock.create).toHaveBeenCalledWith({ op: "update", id: "ev1", calendarId: "work" });
  expect(mock.root).toHaveBeenCalledTimes(1);
});

it("rounds the account clock offset to whole quarter hours", () => {
  // Same timezone: the server minute lags the device by 50 s, and the offset is 0.
  expect(clockOffsetOf("2026-09-22T12:00", new Date(2026, 8, 22, 12, 0, 50).getTime())).toBe(0);
  // The account is 5 h 30 min behind the device.
  expect(clockOffsetOf("2026-09-22T06:30", new Date(2026, 8, 22, 12, 0, 40).getTime())).toBe(-330 * 60_000);
});
