import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// Fix sites #2 and #3 live in src/agenda.tsx: the day-view EmptyView and the
// week-view empty-day placeholder both hand off to `add`. Each must carry the
// *viewed* day in `context.date` so a block created while browsing a future day
// seeds that day. The day date is in scope at both sites (the `date` state in
// the day view, the `date` parameter of `placeholderActions`). These tests drive
// a real render of `agenda.tsx` — into a future day by navigation (day view) and
// across the week's empty days (week view) — and assert `launchCommand` receives
// the viewed day, never a context-less launch that would fall back to today.

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[] }));
const mock = vi.hoisted(() => ({
  data: undefined as unknown,
  loading: false,
  revalidate: vi.fn(),
  storage: {} as Record<string, unknown>,
  storageLoading: false,
  launch: vi.fn(),
}));
// Slot-based react keeps state across renders so day navigation updates `date`.
vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = initial;
    return [
      hooks.slots[slot],
      (next: unknown) => {
        hooks.slots[slot] = typeof next === "function" ? next(hooks.slots[slot]) : next;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = { current: initial };
    return hooks.slots[slot];
  },
  // Effects are deferred and never flushed: the account-day anchoring effect
  // must not snap a navigated future date back to today during the test.
  useEffect: (fn: () => void) => {
    hooks.effects.push(fn);
  },
}));
vi.mock("@raycast/api", () => ({
  Action: Object.assign(() => null, { Push: "Push", OpenInBrowser: "OpenInBrowser" }),
  ActionPanel: Object.assign(() => null, { Section: "ActionSection" }),
  List: Object.assign(() => null, {
    Section: "Section",
    EmptyView: "EmptyView",
    Item: "Item",
    Dropdown: Object.assign(() => null, { Item: "DropdownItem", Section: "DropdownSection" }),
  }),
  Icon: {},
  Keyboard: { Shortcut: { Common: { New: {}, Edit: {}, MoveDown: {}, MoveUp: {}, Refresh: {} } } },
  launchCommand: mock.launch,
  LaunchType: { UserInitiated: "userInitiated" },
  Alert: { ActionStyle: {} },
  confirmAlert: vi.fn(),
  showToast: vi.fn(),
  Toast: { Style: {} },
}));
vi.mock("@raycast/utils", () => ({
  withAccessToken: () => (component: unknown) => component,
  useLocalStorage: (key: string, initial: unknown) => ({
    value: mock.storageLoading ? undefined : key in mock.storage ? mock.storage[key] : initial,
    setValue: vi.fn(),
    isLoading: mock.storageLoading,
  }),
  useCachedPromise: () => ({ data: mock.data, isLoading: mock.loading, revalidate: mock.revalidate, mutate: vi.fn() }),
}));
// agenda-actions is stubbed: its AgendaActions is not rendered on an empty day,
// and useAgendaMutations is not exercised by the Add Block launch.
vi.mock("../src/components/agenda-actions", () => ({
  AgendaActions: "AgendaActions",
  AgendaNavActions: "AgendaNavActions",
  useAgendaMutations: () => ({}),
}));
vi.mock("../src/components/agenda-item", () => ({ AgendaItem: "AgendaItem" }));
vi.mock("../src/components/calendar-fields", () => ({ useCalendars: () => ({ calendars: [], defaultId: undefined }) }));
vi.mock("../src/components/search-view", () => ({ SearchView: "SearchView" }));
vi.mock("../src/components/states", () => ({ refusalView: () => null }));
vi.mock("../src/lib/oauth", () => ({ reassignProvider: {} }));
vi.mock("../src/lib/api", () => ({
  getSchedule: vi.fn(),
  getScheduleRange: vi.fn(),
  writeEvents: vi.fn(),
  undo: vi.fn(),
}));

import Agenda from "../src/agenda";
import { addDaysISO, todayISO } from "../src/lib/format";

type Node = ReactElement<{
  children?: unknown;
  actions?: unknown;
  title?: string;
  onAction?: () => unknown;
}>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions)];
}
function render(): Node[] {
  hooks.cursor = 0;
  hooks.effects = [];
  const element = Agenda({}) as Node;
  return nodes((element.type as (p: unknown) => unknown)(element.props));
}
const pick = (tree: Node[], title: string) => tree.find((n) => n.props.title === title);
const pickAll = (tree: Node[], title: string) => tree.filter((n) => n.props.title === title);

const TODAY = "2026-09-30";
const ADD = { name: "add", type: "userInitiated" };
const emptySchedule = () => ({
  ok: true as const,
  data: { now: "2026-09-30T08:00", timezone: "UTC", days: [], areas: [], activityTypes: [] },
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 30, 9, 0));
  hooks.slots = [];
  mock.storage = {};
  mock.storageLoading = false;
  mock.data = emptySchedule();
  mock.loading = false;
  mock.revalidate.mockReset();
  mock.launch.mockReset();
});
afterEach(() => vi.useRealTimers());

it("day view: Add Block on a navigated future day hands that day, not today", () => {
  expect(todayISO()).toBe(TODAY);
  // The viewed day starts at today, so the empty day shows the Add Block action.
  let tree = render();
  expect(pick(tree, "Add Block…")).toBeDefined();

  // Navigate to tomorrow; the day view re-renders empty for that future day.
  pick(tree, "Next Day")!.props.onAction!();
  tree = render();
  expect(pick(tree, "Add Block…")).toBeDefined();

  // The empty-day Add Block action carries the viewed future day.
  pick(tree, "Add Block…")!.props.onAction!();
  expect(mock.launch).toHaveBeenCalledWith({ ...ADD, context: { date: "2026-10-01" } });
  // No launch was made without the viewed day — the bug always seeded today.
  expect(mock.launch).not.toHaveBeenCalledWith(ADD);
  expect(
    mock.launch.mock.calls.every((c) => (c[0] as { context?: { date?: string } }).context?.date === "2026-10-01"),
  ).toBe(true);
});

it("day view: Add Block on today still carries today (the contract holds on the common path)", () => {
  const tree = render();
  pick(tree, "Add Block…")!.props.onAction!();
  expect(mock.launch).toHaveBeenCalledWith({ ...ADD, context: { date: TODAY } });
  expect(mock.launch).not.toHaveBeenCalledWith(ADD);
});

it("week view: each empty day's Add Block hands that day, not today", () => {
  mock.storage = { "agenda.scope": "week" };
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(TODAY, i));
  mock.data = {
    ok: true,
    todayIso: TODAY,
    days: days.map((d) => ({ date: d, model: { date: d, events: [], areas: [], activityTypes: [] } })),
  };
  const tree = render();

  // Every week day is empty, so each shows a placeholder Add Block for its own day.
  const addActions = pickAll(tree, "Add Block…");
  expect(addActions.length).toBe(7);
  for (const action of addActions) action.props.onAction!();

  // Every viewed day — including each future day — seeds itself, not today.
  for (const day of days) {
    expect(mock.launch).toHaveBeenCalledWith({ ...ADD, context: { date: day } });
  }
  // A future day in particular is the bug scenario: never seeds today.
  expect(mock.launch).toHaveBeenCalledWith({ ...ADD, context: { date: "2026-10-01" } });
  expect(mock.launch).not.toHaveBeenCalledWith(ADD);
  expect(mock.launch.mock.calls.some((c) => (c[0] as { context?: unknown }).context === undefined)).toBe(false);
});
