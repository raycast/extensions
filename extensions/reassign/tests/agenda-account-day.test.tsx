import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// The device clock and the account clock can be on different dates. These tests
// fake the device clock and set a server `now` on the other date, so the Agenda
// must pick the account day. Hooks keep their slots across renders.
const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[] }));
const mock = vi.hoisted(() => ({
  data: undefined as unknown,
  loading: false,
  calls: [] as { fn: (...args: unknown[]) => unknown; args: unknown[] }[],
  storage: {} as Record<string, unknown>,
  storageLoading: false,
}));
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
  useEffect: (fn: () => void) => {
    hooks.effects.push(fn);
  },
}));
vi.mock("@raycast/api", () => ({
  Action: Object.assign(() => null, { Push: "Push", OpenInBrowser: "OpenInBrowser" }),
  ActionPanel: Object.assign(() => null, { Section: "ActionSection" }),
  List: Object.assign(() => null, { Section: "Section", EmptyView: "EmptyView", Item: "Item" }),
  Icon: {},
  LaunchType: {},
  launchCommand: vi.fn(),
}));
vi.mock("@raycast/utils", () => ({
  withAccessToken: () => (component: unknown) => component,
  useLocalStorage: (key: string, initial: unknown) => ({
    value: mock.storageLoading ? undefined : key in mock.storage ? mock.storage[key] : initial,
    setValue: vi.fn(),
    isLoading: mock.storageLoading,
  }),
  useCachedPromise: (fn: (...args: unknown[]) => unknown, args: unknown[]) => {
    mock.calls.push({ fn, args });
    return { data: mock.data, isLoading: mock.loading, revalidate: vi.fn(), mutate: vi.fn() };
  },
}));
vi.mock("../src/components/agenda-actions", () => ({
  AgendaActions: "AgendaActions",
  AgendaNavActions: "AgendaNavActions",
  useAgendaMutations: () => ({}),
}));
vi.mock("../src/components/agenda-item", () => ({ AgendaItem: "AgendaItem" }));
vi.mock("../src/components/calendar-fields", () => ({ useCalendars: () => ({ calendars: [] }) }));
vi.mock("../src/components/search-view", () => ({ SearchView: "SearchView" }));
vi.mock("../src/components/states", () => ({ refusalView: vi.fn(() => ({ type: "Refusal", props: {} })) }));
vi.mock("../src/lib/feedback", () => ({ showApiError: vi.fn() }));
vi.mock("../src/lib/oauth", () => ({ reassignProvider: {} }));
vi.mock("../src/lib/api", () => ({ getSchedule: vi.fn(), getScheduleRange: vi.fn() }));

import { List } from "@raycast/api";
import Agenda from "../src/agenda";
import { refusalView } from "../src/components/states";
import { getScheduleRange } from "../src/lib/api";
import { showApiError } from "../src/lib/feedback";

type Node = ReactElement<{
  children?: unknown;
  actions?: unknown;
  title?: string;
  navigationTitle?: string;
  isLoading?: boolean;
  onAction?: () => void;
}>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions)];
}
/** Render Command and its view, then flush the effects of that render. */
function render(): Node[] {
  hooks.cursor = 0;
  hooks.effects = [];
  const element = Agenda({}) as Node;
  const view = typeof element.type === "function" ? (element.type as (p: unknown) => unknown)(element.props) : element;
  const tree = nodes(view);
  hooks.effects.forEach((fn) => fn());
  return tree;
}
const lastArgs = () => mock.calls[mock.calls.length - 1]?.args;
const schedule = (now: string, days: unknown[] = []) => ({
  ok: true,
  data: { now, timezone: "America/New_York", days, areas: [], activityTypes: [] },
});
const block = (date: string) => ({ id: "b1", start: `${date}T09:00`, end: `${date}T10:00`, name: "Deep work" });

beforeEach(() => {
  // The device is on 2026-09-30; the account is still on 2026-09-29.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 30, 9, 0));
  hooks.slots = [];
  mock.calls = [];
  mock.storage = {};
  mock.storageLoading = false;
  mock.loading = false;
  mock.data = undefined;
  vi.mocked(refusalView).mockClear();
  vi.mocked(showApiError).mockClear();
  vi.mocked(getScheduleRange).mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

it("the day view moves to the account day after the first fresh response", () => {
  mock.data = schedule("2026-09-29T20:00", [{ date: "2026-09-30", events: [] }]);
  render();
  expect(lastArgs()).toEqual(["2026-09-30"]);
  mock.data = schedule("2026-09-29T20:00", [{ date: "2026-09-29", events: [] }]);
  const tree = render();
  expect(lastArgs()).toEqual(["2026-09-29"]);
  expect(tree.find((node) => node.type === List)?.props.navigationTitle).toBe("Agenda · Today");
});

it("the day view does not move on the cached payload while the fetch runs", () => {
  mock.loading = true;
  mock.data = schedule("2026-09-29T20:00", [{ date: "2026-09-30", events: [] }]);
  render();
  render();
  expect(lastArgs()).toEqual(["2026-09-30"]);
});

it("the day view does not move after the user picks a day", () => {
  mock.loading = true;
  mock.data = schedule("2026-09-29T20:00", [{ date: "2026-09-30", events: [] }]);
  const tree = render();
  tree.find((node) => node.props.title === "Next Day")!.props.onAction!();
  mock.loading = false;
  render();
  render();
  expect(lastArgs()).toEqual(["2026-10-01"]);
});

it("the week view starts on the account day, not on the device day", async () => {
  mock.storage["agenda.scope"] = "week";
  render();
  const { fn, args } = mock.calls[mock.calls.length - 1];
  vi.mocked(getScheduleRange).mockResolvedValue(schedule("2026-09-29T20:00") as never);
  const week = (await fn(...args)) as { ok: true; todayIso: string; days: { date: string }[] };
  expect(getScheduleRange).toHaveBeenCalledWith("2026-09-29", "2026-10-07");
  expect(week.todayIso).toBe("2026-09-29");
  expect(week.days.map((day) => day.date)).toEqual([
    "2026-09-29",
    "2026-09-30",
    "2026-10-01",
    "2026-10-02",
    "2026-10-03",
    "2026-10-04",
    "2026-10-05",
  ]);
});

it("shows only a loading list while the stored scope loads, and fetches nothing", () => {
  mock.storageLoading = true;
  const element = Agenda({}) as Node;
  expect(element.type).toBe(List);
  expect(element.props.isLoading).toBe(true);
  expect(mock.calls).toHaveLength(0);
});

it("the day view keeps the last good list over a network error and shows a toast", () => {
  mock.data = schedule("2026-09-30T08:00", [{ date: "2026-09-30", events: [block("2026-09-30")] }]);
  vi.setSystemTime(new Date(2026, 8, 30, 8, 0));
  render();
  const error = { ok: false, code: "network", message: "offline" };
  mock.data = error;
  const tree = render();
  expect(refusalView).not.toHaveBeenCalled();
  expect(tree.some((node) => node.type === "AgendaItem")).toBe(true);
  expect(showApiError).toHaveBeenCalledWith(error);
});

it("a cached network error shows loading, not the error screen, while the refetch runs", () => {
  mock.loading = true;
  mock.data = { ok: false, code: "network", message: "offline" };
  const tree = render();
  expect(refusalView).not.toHaveBeenCalled();
  expect(tree.find((node) => node.type === List)?.props.isLoading).toBe(true);
});

it("a network error with no good list still shows the error screen", () => {
  mock.data = { ok: false, code: "network", message: "offline" };
  render();
  expect(refusalView).toHaveBeenCalled();
});

it("an auth error replaces the list with the sign-in screen", () => {
  mock.data = schedule("2026-09-30T08:00", [{ date: "2026-09-30", events: [block("2026-09-30")] }]);
  vi.setSystemTime(new Date(2026, 8, 30, 8, 0));
  render();
  mock.data = { ok: false, code: "unauthenticated", message: "expired" };
  render();
  expect(refusalView).toHaveBeenCalled();
});

it("the week view keeps the last good list over a network error", () => {
  mock.storage["agenda.scope"] = "week";
  vi.setSystemTime(new Date(2026, 8, 30, 8, 0));
  mock.data = {
    ok: true,
    todayIso: "2026-09-30",
    days: [
      {
        date: "2026-09-30",
        model: { date: "2026-09-30", events: [block("2026-09-30")], areas: [], activityTypes: [] },
      },
    ],
  };
  render();
  mock.data = { ok: false, code: "internal", message: "boom" };
  const tree = render();
  expect(refusalView).not.toHaveBeenCalled();
  expect(tree.some((node) => node.type === "AgendaItem")).toBe(true);
});

it("the day view gives the account day, not the device day, to the actions", () => {
  // The device is on 2026-09-30; the account `now` is on 2026-09-29.
  mock.data = schedule("2026-09-29T20:00", [{ date: "2026-09-30", events: [block("2026-09-30")] }]);
  const tree = render();
  const actions = tree.find((node) => node.type === "AgendaActions") as ReactElement<{ todayIso?: string }>;
  expect(actions.props.todayIso).toBe("2026-09-29");
});

it("the week view gives its account day to the actions", () => {
  mock.storage["agenda.scope"] = "week";
  mock.data = {
    ok: true,
    todayIso: "2026-09-29",
    days: [
      {
        date: "2026-09-30",
        model: { date: "2026-09-30", events: [block("2026-09-30")], areas: [], activityTypes: [] },
      },
    ],
  };
  const tree = render();
  const actions = tree.find((node) => node.type === "AgendaActions") as ReactElement<{ todayIso?: string }>;
  expect(actions.props.todayIso).toBe("2026-09-29");
});
