import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// On a fresh mount of the Agenda (command launch, or a Day/Week scope
// round-trip remount), `useCachedPromise` returns a cached payload with
// isLoading: true until the mount revalidation settles. `useLastGood` must
// record that cache-hit payload for its key, or a transient API blip
// (network/internal/rate_limited) that lands during the launch revalidation
// would replace the cached list with the full-screen error view, with no
// failure toast — the opposite of the hook's documented contract.
//
// This suite models the real mount lifecycle: the slot-based React fake resets
// the mounted view's hook slots on every remount (Command gate -> DayView, or
// a DayView <-> WeekView scope swap), exactly as React would. The
// `useCachedPromise` mock hands back the cached payload with isLoading: true
// on a mount render, then a settled value with isLoading: false after the test
// drives the revalidation. The cache (keyed by args + fn name) persists across
// mounts, like the real cache.

const m = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  effects: [] as (() => void)[],
  // What the mount revalidation settles to. Set by the test, read on the
  // settled render.
  settleData: undefined as unknown,
  settleLoading: false,
  // Mount cache-hit phase: true = first render of a mount (isLoading: true,
  // data = cache); false = revalidation settled.
  mountLoading: true,
  // Per-key cache entries that persist across mounts (the real
  // useCachedPromise cache, keyed by args + fn name so Day and Week don't collide).
  cache: new Map<string, unknown>(),
  revalidate: vi.fn(),
  storage: {} as Record<string, unknown>,
  storageLoading: false,
  calls: [] as { fn: (...args: unknown[]) => unknown; args: unknown[] }[],
}));

vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const slot = m.cursor++;
    if (!(slot in m.slots)) m.slots[slot] = initial;
    return [
      m.slots[slot],
      (next: unknown) => {
        m.slots[slot] = typeof next === "function" ? next(m.slots[slot]) : next;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const slot = m.cursor++;
    if (!(slot in m.slots)) m.slots[slot] = { current: initial };
    return m.slots[slot];
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
  useLocalStorage: (key: string, initial: unknown) => ({
    value: m.storageLoading ? undefined : key in m.storage ? m.storage[key] : initial,
    setValue: (next: unknown) => {
      m.storage[key] = typeof next === "function" ? next(m.storage[key] ?? initial) : next;
    },
    isLoading: m.storageLoading,
  }),
  useCachedPromise: (fn: (...args: unknown[]) => unknown, args: unknown[]) => {
    m.calls.push({ fn, args });
    // Match the real library: the cache key is the function + args, so a day
    // fetch and a week fetch on the same date do not collide.
    const fnKey = (fn as { name?: string }).name ?? "anon";
    const key = `${fnKey}:${JSON.stringify(args)}`;
    let data: unknown;
    let isLoading: boolean;
    if (m.mountLoading) {
      // The real `usePromise` initializer is unconditionally { isLoading: true },
      // and `useCachedPromise` reads the cache synchronously via
      // `useSyncExternalStore` — so the mount render returns the cached payload
      // (if any) with isLoading === true, before the revalidation settles.
      data = m.cache.get(key);
      isLoading = true;
    } else {
      data = m.settleData;
      isLoading = m.settleLoading;
      // Persist a settled good payload to the cache, like the real hook does.
      if (!isLoading && data && (data as { ok?: boolean }).ok) {
        m.cache.set(key, data);
      }
    }
    return { data, isLoading, revalidate: m.revalidate, mutate: vi.fn() };
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
vi.mock("../src/components/states", () => ({
  refusalView: vi.fn((_error: unknown, onRetry: () => void) => ({
    type: "Refusal",
    props: { actions: { type: "Action", props: { title: "Try Again", onAction: onRetry } } },
  })),
}));
vi.mock("../src/lib/feedback", () => ({ showApiError: vi.fn() }));
vi.mock("../src/lib/oauth", () => ({ reassignProvider: {} }));
// The mock uses `fn.name` as the cache-key discriminator (so a day fetch and a
// week fetch on the same date do not collide), so use named functions rather
// than vi.fn() (whose `.name` is not the source identifier).
vi.mock("../src/lib/api", () => ({
  getSchedule: function getSchedule() {
    return undefined as never;
  },
  getScheduleRange: function getScheduleRange() {
    return undefined as never;
  },
}));

import { List } from "@raycast/api";
import Agenda from "../src/agenda";
import { refusalView } from "../src/components/states";
import { showApiError } from "../src/lib/feedback";

type Node = ReactElement<{
  children?: unknown;
  actions?: unknown;
  nav?: unknown;
  event?: { start: string };
  title?: string;
  navigationTitle?: string;
  isLoading?: boolean;
  onAction?: () => void;
  onRefresh?: () => void;
  onToggleScope?: () => void;
}>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions), ...nodes(node.props.nav)];
}

// Command's hooks (the latch ref, scope store) live in parentSlots; the mounted
// view's hooks (anchored, refused, useLastGood's `last`) live in childSlots. A
// render whose returned view element type changes is a remount, so the child
// slots reset — exactly what happens when the gate first settles to DayView, or
// when a Day <-> Week scope swap replaces one view with the other.
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
    // Effects are re-collected on every render; flush them all, matching the
    // laggy-bug harness. Mount effects are guarded by their own refs, and
    // useLastGood's toast effect fires only when its deps warrant it.
    m.effects.forEach((fn) => fn());
  } else {
    tree = nodes(el);
  }
  return { el, tree };
}

function pickAction(tree: Node[], title: string): (() => void) | undefined {
  return tree.find((n) => n.props.title === title)?.props.onAction;
}

const DAY_NOW = "2026-09-30T08:00";
const schedule = (days: { date: string; events: unknown[] }[] = []) => ({
  ok: true as const,
  data: { now: DAY_NOW, timezone: "America/New_York", days, areas: [], activityTypes: [] },
});
const block = (date: string) => ({ id: "b1", start: `${date}T09:00`, end: `${date}T10:00`, name: "Deep work" });
const week = (date: string) => ({
  ok: true as const,
  todayIso: "2026-09-30",
  days: [{ date, model: { date, events: [block(date)], areas: [], activityTypes: [] } }],
});
const dayKey = (date: string) => `getSchedule:["${date}"]`;
const weekKey = (date: string) => `loadWeek:["${date}"]`;
const agendaItemStart = (tree: Node[]) => tree.find((n) => n.type === "AgendaItem")?.props.event?.start;
const listIsLoading = (tree: Node[]) => tree.find((n) => n.type === List)?.props.isLoading;

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
  m.storage = {};
  m.storageLoading = false;
  m.settleData = undefined;
  m.settleLoading = false;
  m.mountLoading = true;
  m.cache.clear();
  m.revalidate.mockReset();
  vi.mocked(refusalView).mockClear();
  vi.mocked(showApiError).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

// The real useLocalStorage returns isLoading: true on the first read of every
// key, so Command gates with a bare <List isLoading /> first. Then the stored
// re-read resolves and the chosen view mounts fresh.
function mountDay(): { el: Node; tree: Node[] } {
  m.storageLoading = true;
  commit();
  m.storageLoading = false;
  return commit();
}
function mountWeek(): { el: Node; tree: Node[] } {
  m.storage["agenda.scope"] = "week";
  m.storageLoading = true;
  commit();
  m.storageLoading = false;
  return commit();
}
/** Drive the mount revalidation to settle, then render. */
function settle(): { el: Node; tree: Node[] } {
  m.mountLoading = false;
  return commit();
}

it.each(["network", "internal", "rate_limited"] as const)(
  "on a fresh DayView mount with a cached day, a %s blip keeps the list and toasts",
  (code) => {
    m.cache.set(dayKey("2026-09-30"), schedule([{ date: "2026-09-30", events: [block("2026-09-30")] }]));

    const first = mountDay();
    // Premise: a mount-time cache hit arrives with isLoading === true and the cached AgendaItem.
    expect(listIsLoading(first.tree)).toBe(true);
    expect(first.tree.some((n) => n.type === "AgendaItem")).toBe(true);
    expect(agendaItemStart(first.tree)).toBe("2026-09-30T09:00");

    // The mount revalidation settles with a transient ApiError.
    const error = { ok: false, code, message: "offline" } as const;
    m.settleData = error;
    const settled = settle();

    expect(refusalView).not.toHaveBeenCalled();
    expect(settled.tree.some((n) => n.type === "AgendaItem")).toBe(true);
    expect(agendaItemStart(settled.tree)).toBe("2026-09-30T09:00");
    expect(showApiError).toHaveBeenCalledWith(error);
  },
);

it("on a fresh DayView mount with a cached day, a settled good refresh keeps the list and toasts nothing", () => {
  m.cache.set(dayKey("2026-09-30"), schedule([{ date: "2026-09-30", events: [block("2026-09-30")] }]));

  const first = mountDay();
  expect(listIsLoading(first.tree)).toBe(true);
  expect(agendaItemStart(first.tree)).toBe("2026-09-30T09:00");

  m.settleData = schedule([{ date: "2026-09-30", events: [block("2026-09-30")] }]);
  const settled = settle();

  expect(refusalView).not.toHaveBeenCalled();
  expect(settled.tree.some((n) => n.type === "AgendaItem")).toBe(true);
  expect(showApiError).not.toHaveBeenCalled();
});

it("on a fresh DayView mount with no cache, a transient blip still shows the error screen and toasts nothing", () => {
  // No cache: the mount render has no AgendaItem and isLoading === true.
  const first = mountDay();
  expect(listIsLoading(first.tree)).toBe(true);
  expect(first.tree.some((n) => n.type === "AgendaItem")).toBe(false);

  const error = { ok: false, code: "network", message: "offline" } as const;
  m.settleData = error;
  const settled = settle();

  expect(refusalView).toHaveBeenCalledWith(error, m.revalidate);
  expect(settled.tree.some((n) => n.type === "AgendaItem")).toBe(false);
  expect(showApiError).not.toHaveBeenCalled();
});

it("on a fresh DayView mount with a cached day, an auth refusal replaces the list (no silent stale-keep)", () => {
  m.cache.set(dayKey("2026-09-30"), schedule([{ date: "2026-09-30", events: [block("2026-09-30")] }]));
  mountDay();

  const error = { ok: false, code: "unauthenticated", message: "expired" } as const;
  m.settleData = error;
  const settled = settle();

  // A non-transient refusal must still take the full screen — useLastGood only
  // keeps the list over a transient blip.
  expect(refusalView).toHaveBeenCalledWith(error, m.revalidate);
  expect(settled.tree.some((n) => n.type === "AgendaItem")).toBe(false);
  expect(showApiError).not.toHaveBeenCalled();
});

it("on a fresh WeekView mount with a cached week, a transient blip keeps the list and toasts", () => {
  m.cache.set(weekKey("2026-09-30"), week("2026-09-30"));

  const first = mountWeek();
  expect(listIsLoading(first.tree)).toBe(true);
  expect(first.tree.some((n) => n.type === "AgendaItem")).toBe(true);
  expect(agendaItemStart(first.tree)).toBe("2026-09-30T09:00");

  const error = { ok: false, code: "internal", message: "boom" } as const;
  m.settleData = error;
  const settled = settle();

  expect(refusalView).not.toHaveBeenCalled();
  expect(settled.tree.some((n) => n.type === "AgendaItem")).toBe(true);
  expect(agendaItemStart(settled.tree)).toBe("2026-09-30T09:00");
  expect(showApiError).toHaveBeenCalledWith(error);
});

it("a day -> week scope round-trip remount keeps the cached week list over a transient blip on the second side", () => {
  // Day view cached and settles good, so it stays on screen and re-seeds the cache.
  m.cache.set(dayKey("2026-09-30"), schedule([{ date: "2026-09-30", events: [block("2026-09-30")] }]));
  mountDay();
  m.settleData = schedule([{ date: "2026-09-30", events: [block("2026-09-30")] }]);
  settle();

  // Toggle to week. The view element type changes (DayView -> WeekView), so the
  // child remounts; pre-seed the week cache so WeekView has a list to show.
  m.storage["agenda.scope"] = "week";
  m.cache.set(weekKey("2026-09-30"), week("2026-09-30"));
  m.mountLoading = true;
  const weekMount = commit();
  expect(weekMount.tree.some((n) => n.type === "AgendaItem")).toBe(true);
  expect(agendaItemStart(weekMount.tree)).toBe("2026-09-30T09:00");

  const error = { ok: false, code: "rate_limited", message: "slow down" } as const;
  m.settleData = error;
  const settled = settle();
  expect(refusalView).not.toHaveBeenCalled();
  expect(settled.tree.some((n) => n.type === "AgendaItem")).toBe(true);
  expect(agendaItemStart(settled.tree)).toBe("2026-09-30T09:00");
  expect(showApiError).toHaveBeenCalledWith(error);
});

it("a week -> day scope round-trip remount keeps the cached day list over a transient blip on the second side", () => {
  m.cache.set(weekKey("2026-09-30"), week("2026-09-30"));
  mountWeek();
  m.settleData = week("2026-09-30");
  settle();

  // Toggle to day; WeekView -> DayView is a remount. Pre-seed the day cache.
  m.storage["agenda.scope"] = "day";
  m.cache.set(dayKey("2026-09-30"), schedule([{ date: "2026-09-30", events: [block("2026-09-30")] }]));
  m.mountLoading = true;
  const dayMount = commit();
  expect(dayMount.tree.some((n) => n.type === "AgendaItem")).toBe(true);
  expect(agendaItemStart(dayMount.tree)).toBe("2026-09-30T09:00");

  const error = { ok: false, code: "network", message: "offline" } as const;
  m.settleData = error;
  const settled = settle();
  expect(refusalView).not.toHaveBeenCalled();
  expect(settled.tree.some((n) => n.type === "AgendaItem")).toBe(true);
  expect(agendaItemStart(settled.tree)).toBe("2026-09-30T09:00");
  expect(showApiError).toHaveBeenCalledWith(error);
});

it("a mount-time cache hit does not contaminate the next day's key under keepPreviousData: false", () => {
  // DayView has keepPreviousData: false, and `useLastGood` must not record a
  // previous day's payload under the new day's key. Seed only D1; navigate to
  // an uncached D2 in-session (after the mount settled good), then fail D2.
  m.cache.set(dayKey("2026-09-30"), schedule([{ date: "2026-09-30", events: [block("2026-09-30")] }]));
  mountDay();
  m.settleData = schedule([{ date: "2026-09-30", events: [block("2026-09-30")] }]);
  settle();

  // Navigate to D2 within the same mount; the new key has no cache and settles
  // with a transient error. useLastGood must NOT keep D1's payload for D2.
  m.mountLoading = true;
  const day = commit();
  pickAction(day.tree, "Next Day")!();
  // D2's mount revalidation: cache miss, then settle to error.
  m.settleData = { ok: false, code: "network", message: "offline" } as const;
  const failed = settle();
  expect(refusalView).toHaveBeenCalled();
  expect(failed.tree.some((n) => n.type === "AgendaItem")).toBe(false);
  expect(showApiError).not.toHaveBeenCalled();
});
