import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// Model the pre-effect render on navigation, then loading and resolution.
// Cache entries round-trip through JSON: Raycast can retain a deserialized copy
// of the previous response, so object identity cannot establish its request key.
// An uncached key returns that copy only when keepPreviousData is enabled.
const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[] }));
const mock = vi.hoisted(() => ({
  // The data / isLoading to return once the current key has resolved.
  data: undefined as unknown,
  loading: false,
  // Phase of the current key's arg-change lifecycle: 0=laggy, 1=loading, 2=resolved.
  phase: 2,
  cache: new Map<string, string>(),
  cachedData: undefined as unknown,
  // The deserialized previous response, available to keepPreviousData.
  prevData: undefined as unknown,
  // The args the mock last saw, so an args change restarts the lifecycle.
  lastArgs: undefined as unknown[] | undefined,
  calls: [] as { fn: (...args: unknown[]) => unknown; args: unknown[] }[],
  storage: {} as Record<string, unknown>,
  storageLoading: false,
  revalidate: vi.fn(),
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
    value: mock.storageLoading ? undefined : key in mock.storage ? mock.storage[key] : initial,
    setValue: vi.fn(),
    isLoading: mock.storageLoading,
  }),
  useCachedPromise: (
    fn: (...args: unknown[]) => unknown,
    args: unknown[],
    options?: { keepPreviousData?: boolean },
  ) => {
    mock.calls.push({ fn, args });
    const key = JSON.stringify(args);
    const lastKey = mock.lastArgs ? JSON.stringify(mock.lastArgs) : undefined;
    if (key !== lastKey) {
      if (lastKey !== undefined) {
        // The first render still has the previous fetch's isLoading=false;
        // the passive effect starts loading after that render.
        mock.phase = 0;
      } else {
        // The very first key has no previous payload; go straight to resolved.
        mock.phase = 2;
      }
      mock.lastArgs = args;
      const cached = mock.cache.get(key);
      mock.cachedData = cached === undefined ? undefined : JSON.parse(cached);
    }
    let data: unknown;
    let isLoading: boolean;
    if (mock.phase < 2) {
      data = mock.cachedData ?? (options?.keepPreviousData ? mock.prevData : undefined);
      isLoading = mock.phase === 1;
    } else {
      data = mock.data;
      isLoading = mock.loading;
      if (!isLoading && data !== undefined) {
        const serialized = JSON.stringify(data);
        mock.cache.set(key, serialized);
        // The hook's post-commit cache effect can replace its laggy reference
        // without re-rendering useLastGood, which still holds the original.
        mock.prevData = JSON.parse(serialized);
      }
    }
    mock.phase = Math.min(mock.phase + 1, 2);
    return { data, isLoading, revalidate: mock.revalidate, mutate: vi.fn() };
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
vi.mock("../src/components/states", () => ({
  refusalView: vi.fn((_error: unknown, onRetry: () => void) => ({
    type: "Refusal",
    props: { actions: { type: "Action", props: { title: "Try Again", onAction: onRetry } } },
  })),
}));
vi.mock("../src/lib/feedback", () => ({ showApiError: vi.fn() }));
vi.mock("../src/lib/oauth", () => ({ reassignProvider: {} }));
vi.mock("../src/lib/api", () => ({ getSchedule: vi.fn(), getScheduleRange: vi.fn() }));

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
}>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions), ...nodes(node.props.nav)];
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

// The account clock stays on the device day (2026-09-30), so neither the anchoring
// effect nor the relative-day label shift the date out from under the test.
const NOW = "2026-09-30T08:00";
const schedule = (days: { date: string; events: unknown[] }[] = []) => ({
  ok: true as const,
  data: { now: NOW, timezone: "America/New_York", days, areas: [], activityTypes: [] },
});
const block = (date: string) => ({ id: "b1", start: `${date}T09:00`, end: `${date}T10:00`, name: "Deep work" });
const networkError = () => ({ ok: false, code: "network", message: "offline" }) as const;
const pick = (tree: Node[], title: string) => tree.find((node) => node.props.title === title);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 30, 9, 0));
  hooks.slots = [];
  mock.calls = [];
  mock.storage = {};
  mock.storageLoading = false;
  mock.data = undefined;
  mock.loading = false;
  mock.phase = 2;
  mock.cache.clear();
  mock.cachedData = undefined;
  mock.prevData = undefined;
  mock.lastArgs = undefined;
  mock.revalidate.mockReset();
  mock.revalidate.mockImplementation(() => {
    mock.loading = true;
  });
  vi.mocked(refusalView).mockClear();
  vi.mocked(showApiError).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

it.each(["network", "internal", "rate_limited"] as const)(
  "an uncached day with a %s failure shows the error screen after a cache round-trip",
  (code) => {
    // D1 (2026-09-30) lands as an empty day.
    mock.data = schedule([{ date: "2026-09-30", events: [] }]);
    const d1 = render();
    // Navigate to D2 (2026-10-01) — an uncached day whose fetch will fail.
    pick(d1, "Next Day")!.props.onAction!();

    // Before the fetch effect runs, an uncached day must not claim to be empty.
    const beforeFetch = render();

    // Render B "loading": isLoading flips true; the spinner shows, not an empty day.
    const loading = render();
    expect(loading.find((node) => node.type === List)?.props.isLoading).toBe(true);
    expect(loading.some((node) => node.props.title === "Nothing planned")).toBe(false);

    // Render C "resolved": D2's fetch comes back with a transient network error.
    const error = { ok: false, code, message: "offline" };
    mock.data = error;
    const resolved = render();

    // The full-screen error screen renders instead of the stale "Nothing planned".
    expect(refusalView).toHaveBeenCalledWith(error, mock.revalidate);
    expect(beforeFetch.some((node) => node.props.title === "Nothing planned")).toBe(false);
    expect(beforeFetch.some((node) => node.type === "AgendaItem")).toBe(false);
    expect(resolved.some((node) => node.props.title === "Nothing planned")).toBe(false);
    // With no kept list for D2, there is no contradictory "transient" toast.
    expect(showApiError).not.toHaveBeenCalled();
  },
);

it("an uncached new day whose fetch succeeds shows that day's content, not a stale empty state", () => {
  // D1 lands as an empty day; D2 will resolve with a block.
  mock.data = schedule([{ date: "2026-09-30", events: [] }]);
  const d1 = render();
  pick(d1, "Next Day")!.props.onAction!();

  // Drive through the laggy and loading renders for the uncached new day.
  render();
  render();

  // D2's fetch resolves with one block for 2026-10-01.
  mock.data = schedule([{ date: "2026-10-01", events: [block("2026-10-01")] }]);
  const resolved = render();

  expect(refusalView).not.toHaveBeenCalled();
  expect(resolved.some((node) => node.type === "AgendaItem")).toBe(true);
  expect(resolved.find((node) => node.type === List)?.props.navigationTitle).toBe("Agenda · Tomorrow");
  expect(resolved.some((node) => node.props.title === "Nothing planned")).toBe(false);
});

it("retrying a failed new day shows loading and then that day's blocks", () => {
  mock.data = schedule([{ date: "2026-09-30", events: [] }]);
  pick(render(), "Next Day")!.props.onAction!();
  render();
  render();
  mock.data = networkError();
  const failed = render();
  expect(refusalView).toHaveBeenCalledWith(mock.data, mock.revalidate);

  pick(failed, "Try Again")!.props.onAction!();
  expect(mock.revalidate).toHaveBeenCalledOnce();
  vi.mocked(refusalView).mockClear();
  const retrying = render();
  expect(retrying.find((node) => node.type === List)?.props.isLoading).toBe(true);
  expect(refusalView).not.toHaveBeenCalled();
  expect(retrying.some((node) => node.props.title === "Nothing planned")).toBe(false);

  mock.loading = false;
  mock.data = schedule([{ date: "2026-10-01", events: [block("2026-10-01")] }]);
  const recovered = render();
  expect(recovered.find((node) => node.type === "AgendaItem")?.props.event?.start).toBe("2026-10-01T09:00");
  expect(recovered.find((node) => node.type === List)?.props.navigationTitle).toBe("Agenda · Tomorrow");
  expect(refusalView).not.toHaveBeenCalled();
});

it("a same-day refresh keeps its blocks while loading and after a transient failure", () => {
  mock.data = schedule([{ date: "2026-09-30", events: [block("2026-09-30")] }]);
  const initial = render();
  initial.find((node) => node.type === "AgendaNavActions")!.props.onRefresh!();
  expect(mock.revalidate).toHaveBeenCalledOnce();
  const loading = render();
  expect(loading.find((node) => node.type === List)?.props.isLoading).toBe(true);
  expect(loading.some((node) => node.type === "AgendaItem")).toBe(true);

  mock.loading = false;
  mock.data = networkError();
  const failed = render();
  expect(failed.find((node) => node.type === "AgendaItem")?.props.event?.start).toBe("2026-09-30T09:00");
  expect(refusalView).not.toHaveBeenCalled();
  expect(showApiError).toHaveBeenCalledWith(mock.data);
});

it("returning to a cached day shows its own blocks and retains them if its refresh fails", () => {
  mock.data = schedule([{ date: "2026-09-30", events: [block("2026-09-30")] }]);
  pick(render(), "Next Day")!.props.onAction!();
  render();
  render();
  mock.data = schedule([{ date: "2026-10-01", events: [block("2026-10-01")] }]);
  pick(render(), "Previous Day")!.props.onAction!();

  const cached = render();
  expect(cached.find((node) => node.type === "AgendaItem")?.props.event?.start).toBe("2026-09-30T09:00");
  expect(cached.find((node) => node.type === List)?.props.navigationTitle).toBe("Agenda · Today");
  render();
  mock.data = networkError();
  const failed = render();
  expect(failed.find((node) => node.type === "AgendaItem")?.props.event?.start).toBe("2026-09-30T09:00");
  expect(refusalView).not.toHaveBeenCalled();
  expect(showApiError).toHaveBeenCalledWith(mock.data);
});

it("an authentication refusal replaces the cached day's blocks", () => {
  mock.data = schedule([{ date: "2026-09-30", events: [block("2026-09-30")] }]);
  const initial = render();
  initial.find((node) => node.type === "AgendaNavActions")!.props.onRefresh!();
  render();
  mock.loading = false;
  mock.data = { ok: false, code: "unauthenticated", message: "expired" };
  const refused = render();
  expect(refusalView).toHaveBeenCalledWith(mock.data, mock.revalidate);
  expect(refused.some((node) => node.type === "AgendaItem")).toBe(false);
  expect(showApiError).not.toHaveBeenCalled();
});
