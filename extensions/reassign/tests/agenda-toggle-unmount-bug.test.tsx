import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// Toggling a kind filter, clearing the filter, or switching the scope persists
// the choice with useLocalStorage. The installed hook's setValue re-enters
// isLoading on revalidation after every write. Command used to gate the view on
// that isLoading on every render, so any toggle returned a bare <List isLoading
// /> at the same position React held the live view, unmounting it and dropping
// its local state (DayView's navigated date and filter; both views' detail pane).
// Latching the gate to the first settled read keeps the view mounted across the
// revalidation. This suite models the setValue lifecycle and a parent/child slot
// reconciler so a remount (gate flash) resets the child's hook slots, exactly as
// React would.

const m = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  effects: [] as (() => void)[],
  data: undefined as unknown,
  loading: false,
  calls: [] as { fn: (...args: unknown[]) => unknown; args: unknown[] }[],
  // Per-key localStorage state, modeling the real setValue lifecycle: a write
  // persists optimistically and flips isLoading true until the re-read resolves.
  storageValues: {} as Record<string, unknown>,
  storageLoading: {} as Record<string, boolean>,
}));

vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const slot = m.cursor++;
    const slots = m.slots;
    if (!(slot in slots)) slots[slot] = initial;
    return [
      slots[slot],
      (next: unknown) => {
        slots[slot] = typeof next === "function" ? next(slots[slot]) : next;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const slot = m.cursor++;
    const slots = m.slots;
    if (!(slot in slots)) slots[slot] = { current: initial };
    return slots[slot] as { current: unknown };
  },
  useEffect: (fn: () => void) => {
    m.effects.push(fn);
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
  LaunchType: {},
  launchCommand: vi.fn(),
}));
vi.mock("@raycast/utils", () => ({
  withAccessToken: () => (component: unknown) => component,
  useLocalStorage: (key: string, initial: unknown) => {
    const value = key in m.storageValues ? m.storageValues[key] : initial;
    const isLoading = m.storageLoading[key] ?? false;
    const setValue = (next: unknown) => {
      m.storageValues[key] = typeof next === "function" ? next(m.storageValues[key] ?? initial) : next;
      m.storageLoading[key] = true;
    };
    return { value, setValue, isLoading };
  },
  useCachedPromise: (fn: (...args: unknown[]) => unknown, args: unknown[]) => {
    m.calls.push({ fn, args });
    return { data: m.data, isLoading: m.loading, revalidate: vi.fn(), mutate: vi.fn() };
  },
}));
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
vi.mock("../src/lib/api", () => ({ getSchedule: vi.fn(), getScheduleRange: vi.fn() }));

import { List } from "@raycast/api";
import Agenda from "../src/agenda";

type KindProps = { onToggleNonBlocking: () => void; onToggleReference: () => void };
type Node = ReactElement<{
  children?: unknown;
  actions?: unknown;
  title?: string;
  navigationTitle?: string;
  isLoading?: boolean;
  onAction?: () => void;
  kind?: KindProps;
  onToggleScope?: () => void;
}>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions)];
}

// Command's hooks (the latch ref) live in parentSlots; the mounted view's hooks
// live in childSlots. A render whose returned element type changes is a remount,
// so the child slots reset, exactly as React unmounts/remounts by element type.
let parentSlots: unknown[];
let childSlots: unknown[];
let childType: unknown;

function commit(): { el: Node; tree: Node[] } {
  m.slots = parentSlots;
  m.cursor = 0;
  m.effects = [];
  const el = Agenda({}) as Node;
  const mounted = el.type !== childType;
  if (mounted) childSlots = [];
  childType = el.type;
  let tree: Node[];
  if (typeof el.type === "function" && el.type !== List) {
    m.slots = childSlots;
    m.cursor = 0;
    m.effects = [];
    const view = (el.type as (p: unknown) => unknown)(el.props);
    tree = nodes(view);
    if (mounted) m.effects.forEach((fn) => fn());
  } else {
    tree = nodes(el);
  }
  return { el, tree };
}

const lastArgs = () => m.calls[m.calls.length - 1]?.args;
const pick = (tree: Node[], title: string) => tree.find((node) => node.props.title === title);
const schedule = (days: { date: string; events: unknown[] }[]) => ({
  ok: true,
  data: { now: "2026-09-30T09:00", timezone: "America/New_York", days, areas: [], activityTypes: [] },
});
const nonBlocking = (date: string) => ({
  id: "e1",
  start: `${date}T09:00`,
  end: `${date}T10:00`,
  kind: "non_blocking",
  name: "Lunch",
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 30, 9, 0));
  parentSlots = [];
  childSlots = [];
  childType = undefined;
  m.slots = parentSlots;
  m.cursor = 0;
  m.effects = [];
  m.calls = [];
  m.storageValues = {};
  // The real hook returns isLoading: true on the first read of every key; the
  // gate must still apply once, at mount, before the stored values are known.
  m.storageLoading = {
    "agenda.scope": true,
    "agenda.hideNonBlocking": true,
    "agenda.hideReference": true,
  };
  m.loading = false;
  m.data = undefined;
});
afterEach(() => {
  vi.useRealTimers();
});

function mountDay(): { el: Node; tree: Node[] } {
  // First the gate (bare List); then the stored re-read resolves and DayView mounts.
  commit();
  m.storageLoading = {};
  return commit();
}

it("shows only a bare loading list before the stored values load, and fetches nothing", () => {
  const { el } = commit();
  expect(el.type).toBe(List);
  expect(el.props.isLoading).toBe(true);
  expect(m.calls).toHaveLength(0);
});

it("keeps the day view mounted and preserves the navigated day across a non-blocking toggle revalidation", () => {
  m.data = schedule([]);
  const first = mountDay();
  expect(lastArgs()).toEqual(["2026-09-30"]);

  // Navigate to tomorrow; the anchoring ref is set, so the view stays there.
  pick(first.tree, "Next Day")!.props.onAction!();
  commit();
  expect(lastArgs()).toEqual(["2026-10-01"]);

  // Toggling a kind filter writes to storage, re-entering isLoading on revalidation.
  const before = commit();
  before.el.props.kind!.onToggleNonBlocking();
  expect(m.storageLoading["agenda.hideNonBlocking"]).toBe(true);

  // During the revalidation the view must stay mounted (no bare-gate flash) and
  // keep the navigated day; a bare List at this position would unmount DayView.
  const during = commit();
  expect(during.el.type).not.toBe(List);
  expect(lastArgs()).toEqual(["2026-10-01"]);

  // The re-read resolves; the view was never unmounted, so tomorrow survives.
  m.storageLoading = {};
  commit();
  expect(lastArgs()).toEqual(["2026-10-01"]);
});

it("keeps the day view mounted and preserves the navigated day across a reference toggle revalidation", () => {
  m.data = schedule([]);
  const first = mountDay();
  pick(first.tree, "Next Day")!.props.onAction!();
  commit();
  expect(lastArgs()).toEqual(["2026-10-01"]);

  const before = commit();
  before.el.props.kind!.onToggleReference();
  expect(m.storageLoading["agenda.hideReference"]).toBe(true);

  const during = commit();
  expect(during.el.type).not.toBe(List);
  expect(lastArgs()).toEqual(["2026-10-01"]);

  m.storageLoading = {};
  commit();
  expect(lastArgs()).toEqual(["2026-10-01"]);
});

it("keeps the day view mounted and preserves the navigated day across a Clear Filter revalidation", () => {
  // A day whose only block is non-blocking, with the toggle on, is filtered empty,
  // so the EmptyView offers a Clear Filter that toggles the kind filter off.
  m.storageValues["agenda.hideNonBlocking"] = true;
  m.data = schedule([{ date: "2026-10-01", events: [nonBlocking("2026-10-01")] }]);
  const first = mountDay();
  // The device day (2026-09-30) is empty; navigate to the filtered day.
  expect(lastArgs()).toEqual(["2026-09-30"]);
  pick(first.tree, "Next Day")!.props.onAction!();
  const day = commit().tree;
  expect(lastArgs()).toEqual(["2026-10-01"]);
  expect(pick(day, "Clear Filter")).toBeDefined();

  pick(day, "Clear Filter")!.props.onAction!();
  expect(m.storageLoading["agenda.hideNonBlocking"]).toBe(true);

  const during = commit();
  expect(during.el.type).not.toBe(List);
  expect(lastArgs()).toEqual(["2026-10-01"]);

  m.storageLoading = {};
  commit();
  expect(lastArgs()).toEqual(["2026-10-01"]);
});

it("switches the scope to week without flashing a bare loading list", () => {
  m.data = schedule([]);
  const first = mountDay();
  first.el.props.onToggleScope!();
  expect(m.storageValues["agenda.scope"]).toBe("week");
  expect(m.storageLoading["agenda.scope"]).toBe(true);

  // The week view reads its own payload shape ({ ok, todayIso, days }); switch
  // to it now that the day view is no longer rendering.
  m.data = { ok: true, todayIso: "2026-09-30", days: [] };

  // The view kind changes (Day -> Week) so the child remounts, but the gate must
  // not flash a bare List: WeekView mounts directly across the revalidation.
  const during = commit();
  expect(during.el.type).not.toBe(List);

  m.storageLoading = {};
  const after = commit();
  expect(after.el.type).not.toBe(List);
});
