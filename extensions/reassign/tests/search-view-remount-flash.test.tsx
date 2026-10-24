import { beforeEach, expect, it, vi } from "vitest";

// Re-mount with a cached gate refusal. `useCachedPromise` returns the cached
// refusal on the first render, while the first fetch is in flight. SearchView
// must not show the gate (or start OAuth) until a fetch settles. A gate that is
// on screen must stay mounted during its own revalidate (#72), or ReauthView
// mounts again and starts a second automatic sign-in.

type SearchEvent = { id: string; name: string; date: string; start: string; end: string };
type OkData = { ok: true; data: { events: SearchEvent[] } };
type ErrorData = {
  ok: false;
  code: "network" | "unauthenticated" | "unauthorized" | "signed_out" | "permission" | "scope";
  message: string;
};
type Wrapped = { query: string; result: OkData | ErrorData };

const m = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  effects: [] as (() => void)[],
  revalidate: vi.fn(),
  signIn: vi.fn(),
  laggy: undefined as Wrapped | undefined,
  isLoadingState: true,
}));

vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const slot = m.cursor++;
    if (!(slot in m.slots)) m.slots[slot] = initial;
    return [
      m.slots[slot],
      (value: unknown) => {
        m.slots[slot] = typeof value === "function" ? (value as (v: unknown) => unknown)(m.slots[slot]) : value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const slot = m.cursor++;
    if (!(slot in m.slots)) m.slots[slot] = { current: initial };
    return m.slots[slot] as { current: unknown };
  },
  // Collect effects. Only the mounted-gate test runs them, as mount effects.
  useEffect: (fn: () => void) => {
    m.effects.push(fn);
  },
}));

vi.mock("@raycast/api", () => ({
  Action: Object.assign(
    function Action() {
      return null;
    },
    { OpenInBrowser: "OpenInBrowser" },
  ),
  ActionPanel: "ActionPanel",
  Color: {},
  Icon: {},
  Keyboard: { Shortcut: { Common: { Refresh: "refresh" } } },
  List: Object.assign(
    function List() {
      return null;
    },
    {
      Section: "Section",
      Item: "Item",
      EmptyView: "EmptyView",
    },
  ),
}));

// `laggy` is the cache. `isLoadingState: true` is the fetch that starts on mount.
vi.mock("@raycast/utils", () => ({
  useCachedPromise: (_fn: unknown, _args: unknown[], options: { execute: boolean }) => ({
    data: m.laggy,
    isLoading: options.execute ? m.isLoadingState : false,
    revalidate: m.revalidate,
  }),
}));

vi.mock("../src/lib/api", () => ({ searchEvents: vi.fn() }));
vi.mock("../src/lib/oauth", () => ({ signIn: m.signIn }));
vi.mock("../src/components/states", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/components/states")>();
  return { ...actual, refusalView: vi.fn(actual.refusalView) };
});

import { List } from "@raycast/api";
import * as states from "../src/components/states";
import { SearchView } from "../src/components/search-view";

const { refusalView } = states;

type Node = {
  type: unknown;
  props: {
    children?: unknown;
    actions?: unknown;
    title?: string;
    description?: string;
    isLoading?: boolean;
  } & Record<string, unknown>;
};

function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in (value as Record<string, unknown>))) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions)];
}

// A re-mount resets the hook slots, but not the `useCachedPromise` cache (`m.laggy`).
function render(initialQuery?: string): Node[] {
  m.cursor = 0;
  return nodes(SearchView({ initialQuery }));
}

function emptyTitle(tree: Node[]): string | undefined {
  return tree.find((n) => n.type === "EmptyView")?.props.title;
}

function emptyDesc(tree: Node[]): string | undefined {
  return tree.find((n) => n.type === "EmptyView")?.props.description;
}

function listIsLoading(tree: Node[]): boolean | undefined {
  return tree.find((n) => n.type === List)?.props.isLoading;
}

const REFUSAL: ErrorData = { ok: false, code: "scope", message: "Missing consent scope." };

beforeEach(() => {
  m.slots = [];
  m.cursor = 0;
  m.effects = [];
  m.laggy = undefined;
  m.isLoadingState = true;
  m.revalidate.mockReset();
  m.signIn.mockReset();
  m.signIn.mockResolvedValue(undefined);
  vi.mocked(refusalView).mockReset();
  vi.mocked(refusalView).mockImplementation(() => ({ type: "refusalView", props: {} }) as never);
});

it("[scope re-mount] first commit with cached `scope` failure and in-flight re-fetch must NOT call refusalView", () => {
  m.laggy = { query: "abc", result: { ok: false, code: "scope", message: "Missing consent scope." } };
  m.isLoadingState = true;

  const tree = render("abc");

  expect(refusalView).not.toHaveBeenCalled();
  expect(emptyTitle(tree)).toBe("Searching…");
  expect(emptyDesc(tree)).toBe(`Finding blocks that match “abc”.`);
  expect(listIsLoading(tree)).toBe(true);
});

it("[permission re-mount] first commit with cached `permission` failure and in-flight re-fetch must NOT call refusalView", () => {
  m.laggy = {
    query: "abc",
    result: { ok: false, code: "permission", message: "Reassign needs an active subscription." },
  };
  m.isLoadingState = true;

  const tree = render("abc");

  expect(refusalView).not.toHaveBeenCalled();
  expect(emptyTitle(tree)).toBe("Searching…");
  expect(emptyDesc(tree)).toBe(`Finding blocks that match “abc”.`);
  expect(listIsLoading(tree)).toBe(true);
});

it("[network re-mount] CONTROL: cached `network` failure with in-flight re-fetch keeps neutral 'Searching…'", () => {
  m.laggy = { query: "abc", result: { ok: false, code: "network", message: "offline" } };
  m.isLoadingState = true;

  const tree = render("abc");

  expect(refusalView).not.toHaveBeenCalled();
  expect(emptyTitle(tree)).toBe("Searching…");
  expect(emptyDesc(tree)).toBe(`Finding blocks that match “abc”.`);
  expect(listIsLoading(tree)).toBe(true);
});

it("[scope settle] once the re-fetch resolves with `scope` again, refusalView IS correct (gate view should appear)", () => {
  m.laggy = { query: "abc", result: REFUSAL };
  m.isLoadingState = true;
  render("abc");
  expect(refusalView).not.toHaveBeenCalled();

  // The same mount: the fetch settles with the refusal.
  m.isLoadingState = false;
  const tree = render("abc");

  expect(refusalView).toHaveBeenCalledTimes(1);
  expect(refusalView).toHaveBeenCalledWith(REFUSAL, m.revalidate);
  expect(tree.some((n) => n.type === "refusalView")).toBe(true);
  expect(tree.find((n) => n.type === "EmptyView")).toBeUndefined();
});

it("[success settle] after in-band recovery the re-fetch returns ok and no refusalView (no flash, correct verdict)", () => {
  m.laggy = { query: "abc", result: { ok: true, data: { events: [] } } };
  m.isLoadingState = false;

  const tree = render("abc");

  expect(refusalView).not.toHaveBeenCalled();
  expect(emptyTitle(tree)).toBe("No matches");
  expect(emptyDesc(tree)).toBe(`Nothing matches “abc”.`);
  expect(listIsLoading(tree)).toBe(false);
});

it("[revalidate] the gate stays mounted during its own revalidate, and automatic sign-in does not start again", async () => {
  const actual = await vi.importActual<typeof import("../src/components/states")>("../src/components/states");
  vi.mocked(refusalView).mockImplementation(actual.refusalView);
  const parentSlots: unknown[] = [];
  let childSlots: unknown[] = [];
  let childType: unknown;
  // A small reconciler: a new root type mounts a fresh child and runs its mount effects.
  function commit() {
    m.slots = parentSlots;
    m.cursor = 0;
    const el = SearchView({ initialQuery: "abc" }) as unknown as { type: unknown; props: unknown };
    const mounted = el.type !== childType;
    if (mounted) childSlots = [];
    childType = el.type;
    if (typeof el.type === "function" && el.type !== List) {
      m.slots = childSlots;
      m.cursor = 0;
      m.effects = [];
      (el.type as (p: unknown) => unknown)(el.props);
      if (mounted) m.effects.forEach((fn) => fn());
    }
    return el;
  }

  // The fetch settles with `unauthorized`: the gate mounts and signs in once.
  m.laggy = { query: "abc", result: { ok: false, code: "unauthorized", message: "401" } };
  m.isLoadingState = false;
  const first = commit();
  expect(m.signIn).toHaveBeenCalledTimes(1);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(m.revalidate).toHaveBeenCalledTimes(1);

  // ReauthView's revalidate is in flight, and the cache still holds the same refusal.
  m.isLoadingState = true;
  const during = commit();
  expect(during.type).toBe(first.type);

  // The revalidate settles with the same refusal. No second automatic sign-in.
  m.isLoadingState = false;
  const after = commit();
  expect(after.type).toBe(first.type);
  expect(m.signIn).toHaveBeenCalledTimes(1);
});
