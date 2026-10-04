import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// The device clock and the account clock can be on different dates. These tests
// fake the device clock and set a server `now` on the other date, so Add Block
// must parse the capture and pick the window on the account clock.
const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[] }));
const mock = vi.hoisted(() => ({
  data: undefined as unknown,
  loading: true,
  create: vi.fn(),
  plan: vi.fn(),
}));
vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = initial;
    return [
      hooks.slots[slot],
      (value: unknown) => {
        hooks.slots[slot] = typeof value === "function" ? value(hooks.slots[slot]) : value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = { current: initial };
    return hooks.slots[slot];
  },
  useEffect: (fn: () => void) => {
    hooks.effects.push(fn);
  },
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
    DatePicker: Object.assign("DatePicker", { Type: { DateTime: "date_time" }, isFullDay: () => false }),
  }),
  Icon: {},
  List: Object.assign("List", { Item: "ListItem" }),
  getSelectedText: async () => "",
  popToRoot: vi.fn(),
  useNavigation: () => ({ push: vi.fn() }),
  showToast: async () => ({ hide: async () => undefined }),
  Toast: { Style: {} },
}));
vi.mock("@raycast/utils", () => ({
  withAccessToken: () => (component: unknown) => component,
  useCachedPromise: () => ({ data: mock.data, isLoading: mock.loading, revalidate: vi.fn() }),
}));
vi.mock("../src/lib/oauth", () => ({ reassignProvider: {} }));
vi.mock("../src/lib/api", () => ({
  getSchedule: vi.fn(),
  writeEvents: (ops: unknown[]) => mock.create(ops[0]),
  backlogCaptureText: vi.fn(),
  planSchedule: mock.plan,
  confirmSchedule: vi.fn(),
}));
vi.mock("../src/components/ai-fill-form", () => ({ AiFillForm: "AiFillForm" }));
vi.mock("../src/components/states", () => ({ refusalView: vi.fn() }));
vi.mock("../src/components/calendar-fields", () => ({
  useCalendars: () => ({ writable: [] }),
  calendarCreateFields: () => ({}),
  CalendarFields: "CalendarFields",
  CALENDAR_DEFAULT: "",
}));
import AddCommand from "../src/add";

type Node = ReactElement<{
  id?: string;
  title?: string;
  value?: unknown;
  children?: unknown;
  actions?: unknown;
  onChange: (value: unknown) => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions)];
}
function render(text: string) {
  hooks.cursor = 0;
  hooks.effects = [];
  return nodes(AddCommand({ arguments: { text } }));
}
/** The first render parses on the device clock; the schedule read then brings the account clock. */
function renderWithAccountClock(text: string, now: string, beforeRead?: (tree: Node[]) => void) {
  const first = render(text);
  beforeRead?.(first);
  mock.data = { ok: true, data: { now, areas: [], activityTypes: [] } };
  mock.loading = false;
  render(text);
  for (const effect of hooks.effects) effect();
  return render(text);
}
const field = (tree: Node[], id: string) => tree.find((n) => n.props.id === id)!.props.value;
const submitValues = (tree: Node[]) => ({
  name: "gym",
  start: field(tree, "start"),
  end: field(tree, "end"),
  duration: "",
  notes: "",
  areaId: "",
  activityTypeId: "",
  kind: "blocking",
});

beforeEach(() => {
  hooks.slots = [];
  mock.data = undefined;
  mock.loading = true;
  mock.create.mockReset().mockResolvedValue({ ok: true, data: { results: [{ index: 0, status: "ok" }] } });
  mock.plan.mockReset().mockResolvedValue({ ok: true, data: { results: [] } });
  vi.useFakeTimers({ toFake: ["Date"] });
  // The device is already on the 23rd; the account is still on the evening of the 22nd.
  vi.setSystemTime(new Date(2026, 8, 23, 0, 30));
});
afterEach(() => vi.useRealTimers());

it("parses a relative day on the account date, not the device date", async () => {
  const tree = renderWithAccountClock("gym tomorrow at 10am", "2026-09-22T18:30");
  await tree.find((n) => n.props.title === "Schedule Block")!.props.onSubmit(submitValues(tree));
  expect(mock.create).toHaveBeenCalledWith(
    expect.objectContaining({ start: "2026-09-23T10:00", end: "2026-09-23T10:30" }),
  );
});

it("finds a slot in today's window on the account clock", async () => {
  const tree = renderWithAccountClock("read 1h", "2026-09-22T18:30");
  await tree.find((n) => n.props.title === "Find a Time")!.props.onSubmit({ ...submitValues(tree), duration: "1h" });
  expect(mock.plan).toHaveBeenCalledWith([
    expect.objectContaining({ earliest: "2026-09-22T08:00", latest: "2026-09-22T22:00" }),
  ]);
});

it("keeps a start that the user chose before the account clock arrived", async () => {
  const chosen = new Date(2026, 8, 25, 9);
  const tree = renderWithAccountClock("gym tomorrow at 10am", "2026-09-22T18:30", (first) =>
    first.find((n) => n.props.id === "start")!.props.onChange(chosen),
  );
  expect(field(tree, "start")).toBe(chosen);
});
