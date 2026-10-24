import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// The Agenda "Add Block…" action hands off to `add` via `launchContext.date`.
// These tests reproduce the consumer side of that contract: mounting `add`'s
// Command with a `launchContext.date` must seed the planning date (and thus the
// "Find a Time" booking day) on that date, while a context-less launch seeds
// today. The producer side (agenda passing the viewed day) is covered by the
// `agenda-*-launch-context` suites; this file proves the wire is honored when a
// date is supplied, which is what makes the producer fix change user behavior.

const mock = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  fullDays: new WeakSet<Date>(),
  capture: vi.fn(),
  create: vi.fn(),
  book: vi.fn(),
  read: vi.fn(),
  free: vi.fn(),
  calendar: {} as Record<string, unknown>,
  root: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
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
  List: Object.assign("List", { Item: "ListItem", EmptyView: "EmptyView" }),
  popToRoot: mock.root,
  useNavigation: () => ({ push: mock.push }),
  showToast: mock.toast,
  Toast: { Style: {} },
  getSelectedText: async () => "",
}));
vi.mock("@raycast/utils", () => ({
  withAccessToken: () => (component: unknown) => component,
  useCachedPromise: () => ({ data: { ok: true, data: { areas: [], activityTypes: [] } } }),
}));
vi.mock("../src/lib/oauth", () => ({ reassignProvider: {} }));
vi.mock("../src/lib/api", async (importOriginal) => ({
  nearestSlotsOf: (await importOriginal<typeof import("../src/lib/api")>()).nearestSlotsOf,
  getSchedule: mock.read,
  writeEvents: (ops: unknown[]) => mock.create(ops[0]),
  bookSlot: mock.book,
  backlogCaptureText: mock.capture,
  getFreeSlots: mock.free,
}));
vi.mock("../src/components/ai-fill-form", () => ({ AiFillForm: "AiFillForm" }));
vi.mock("../src/components/states", () => ({ refusalView: vi.fn() }));
vi.mock("../src/components/calendar-fields", () => ({
  useCalendars: () => ({ writable: [] }),
  calendarCreateFields: () => mock.calendar,
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
  text?: string;
  value?: unknown;
  children?: unknown;
  actions?: unknown;
  onChange: (v: unknown) => void;
  onSubmit: (v: Values) => Promise<void>;
}>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions)];
}
function render(launchContext?: { date?: string }) {
  mock.cursor = 0;
  return nodes(AddCommand({ arguments: { text: "" }, launchContext }));
}
const values: Values = {
  name: "idea",
  start: null,
  end: null,
  duration: "45m",
  notes: "",
  areaId: "",
  activityTypeId: "",
  kind: "blocking",
};
const previewText = (tree: Node[]) => tree.find((n) => n.props.title === "Preview")?.props.text;

// Freeze the clock so "today" is deterministic; the account clock stays on the
// device day (taxonomy has no `now`), so the seeded planning date is the only day.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 22, 10, 0));
  mock.slots = [];
  mock.cursor = 0;
  mock.fullDays = new WeakSet();
  mock.calendar = {};
  for (const fn of [mock.capture, mock.create, mock.book, mock.read, mock.root, mock.free, mock.push, mock.toast])
    fn.mockReset();
  mock.toast.mockImplementation(async (options) => ({ ...options, hide: async () => undefined }));
  mock.read.mockResolvedValue({ ok: true, data: { days: [] } });
  mock.free.mockResolvedValue({ ok: true, data: { days: [] } });
});
afterEach(() => vi.useRealTimers());

it("a context-less launch seeds the planning date on today", () => {
  const tree = render();
  // No day was named by a launcher or the text, so the preview stays a generic Inbox.
  expect(previewText(tree)).toBe("Inbox — save now, schedule later");
});

it("a context date seeds the planning date and the 'planned for' preview", () => {
  const tree = render({ date: "2026-09-29" });
  expect(previewText(tree)).toBe("Inbox — planned for 2026-09-29, no time set");
});

it("a duration on a context-less launch searches today, not a viewed day", async () => {
  render()
    .find((n) => n.props.id === "duration")!
    .props.onChange("45m");
  expect(previewText(render())).toBe("Find 45m on 2026-09-22");
  await render()
    .find((n) => n.props.title === "Find a Time")!
    .props.onSubmit(values);
  // runFlexible books on the seeded planning date: today.
  expect(mock.free).toHaveBeenCalledWith("2026-09-22", "2026-09-22", 45);
});

it("a duration with a launchContext.date searches that day, not today", async () => {
  render({ date: "2026-09-29" })
    .find((n) => n.props.id === "duration")!
    .props.onChange("45m");
  expect(previewText(render())).toBe("Find 45m on 2026-09-29");
  await render({ date: "2026-09-29" })
    .find((n) => n.props.title === "Find a Time")!
    .props.onSubmit(values);
  // The viewed day (handed off via launchContext.date) becomes the booking day.
  expect(mock.free).toHaveBeenCalledWith("2026-09-29", "2026-09-29", 45);
  expect(mock.free).not.toHaveBeenCalledWith("2026-09-22", "2026-09-22", 45);
});
