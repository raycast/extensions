import { beforeEach, expect, it, vi } from "vitest";

type SearchEvent = { id: string; name: string; date: string; start: string; end: string };
type OkData = { ok: true; data: { events: SearchEvent[] } };
type ErrorData = { ok: false; code: "network" | "unauthenticated" | "permission" | "scope"; message: string };
// SearchView tags each resolved payload with the query it was issued for, so the
// hook's `data` is `{ query, result }`. `laggy` mirrors `keepPreviousData`'s
// `laggyDataRef`, which the real hook republishes on the empty-cache-key branch.
type Wrapped = { query: string; result: OkData | ErrorData };

const mock = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  revalidate: vi.fn(),
  laggy: undefined as Wrapped | undefined,
  error: undefined as ErrorData | undefined,
  loading: false,
  pending: false,
  options: undefined as { execute: boolean; keepPreviousData: boolean } | undefined,
  events: [] as SearchEvent[],
}));

vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const slot = mock.cursor++;
    if (!(slot in mock.slots)) mock.slots[slot] = initial;
    return [
      mock.slots[slot],
      (value: unknown) => {
        mock.slots[slot] = typeof value === "function" ? (value as (v: unknown) => unknown)(mock.slots[slot]) : value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const slot = mock.cursor++;
    if (!(slot in mock.slots)) mock.slots[slot] = { current: initial };
    return mock.slots[slot] as { current: unknown };
  },
  useEffect: () => undefined,
}));

vi.mock("@raycast/api", () => ({
  Action: Object.assign(
    function Action() {
      return null;
    },
    { OpenInBrowser: "OpenInBrowser" },
  ),
  ActionPanel: "ActionPanel",
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

// Reproduce the shipped `useCachedPromise` interaction that causes the bug:
// `execute: query.length > 0` skips the promise for the empty cache key, and
// `keepPreviousData: true` republishes the previous query's data (laggyDataRef)
// under that empty key. The mock keeps the real hook's observable behaviour:
// a non-empty query resolves and pins `laggy`; an empty query falls back to it.
// `pending` models the very first in-flight fetch in a mounted SearchView, where
// `laggyDataRef.current` is still undefined and `keepPreviousData` republishes
// `undefined` as `data` while `isLoading === true`.
// SearchView wraps its call as `({ query, result: await searchEvents(q) })`, so
// `data` is the tagged shape; `laggy` holds the wrapped value to match the real
// hook's `laggyDataRef`.
vi.mock("@raycast/utils", () => ({
  useCachedPromise: (_fn: unknown, args: unknown[], options: { execute: boolean; keepPreviousData: boolean }) => {
    mock.options = options;
    const [query] = args as [string];
    if (query.length > 0) {
      if (mock.pending) {
        return { data: undefined, isLoading: options.execute && mock.loading, revalidate: mock.revalidate };
      }
      const result = mock.error ?? { ok: true as const, data: { events: mock.events } };
      const wrapped: Wrapped = { query, result };
      mock.laggy = wrapped;
      return { data: wrapped, isLoading: options.execute && mock.loading, revalidate: mock.revalidate };
    }
    return { data: mock.laggy, isLoading: options.execute && mock.loading, revalidate: mock.revalidate };
  },
}));

vi.mock("../src/lib/api", () => ({ searchEvents: vi.fn() }));
vi.mock("../src/components/states", () => ({ refusalView: vi.fn(() => ({ type: "refusalView", props: {} })) }));

import { List } from "@raycast/api";
import { SearchView } from "../src/components/search-view";

type Node = {
  type: unknown;
  props: {
    children?: unknown;
    actions?: unknown;
    title?: string;
    description?: string;
    onAction?: () => void;
  } & Record<string, unknown>;
};
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in (value as Record<string, unknown>))) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions)];
}

function render(initialQuery?: string) {
  mock.cursor = 0;
  return nodes(SearchView({ initialQuery }));
}

function typeIntoSearchBar(tree: Node[], text: string) {
  const list = tree.find((n) => n.type === List);
  if (!list) throw new Error("List not rendered");
  (list.props.onSearchTextChange as (v: string) => void)(text);
}

const hit: SearchEvent = { id: "e1", name: "Standup", date: "2026-09-22", start: "09:00", end: "09:30" };

beforeEach(() => {
  mock.slots = [];
  mock.cursor = 0;
  mock.laggy = undefined;
  mock.events = [hit];
  mock.error = undefined;
  mock.loading = false;
  mock.pending = false;
  mock.options = undefined;
  mock.revalidate.mockReset();
});

it("shows the 'Search your blocks' empty state after a matching query is cleared (the bug)", () => {
  // Fresh launch: empty bar -> placeholder empty state, no rows.
  let tree = render();
  expect(tree.filter((n) => n.type === "Item")).toHaveLength(0);
  expect(tree.find((n) => n.type === "EmptyView")?.props.title).toBe("Search your blocks");
  expect(tree.find((n) => n.type === "EmptyView")?.props.description).toBe(
    "Type a word to find a block by name, from the last 7 days to the next 30.",
  );

  // Type a word that returns >= 1 hit; laggyDataRef is now pinned to these hits.
  typeIntoSearchBar(tree, "standup");
  tree = render();
  expect(tree.filter((n) => n.type === "Item")).toHaveLength(1);
  expect(tree.find((n) => n.type === "Item")?.props.title).toBe("Standup");

  // Clear the bar: execute:false + keepPreviousData republishes the standup hits
  // as `data`. The fix must drop them so the placeholder shows, not the stale rows.
  typeIntoSearchBar(tree, "");
  tree = render();
  expect(tree.filter((n) => n.type === "Item")).toHaveLength(0);
  expect(tree.find((n) => n.type === "EmptyView")?.props.title).toBe("Search your blocks");
  expect(tree.find((n) => n.type === "EmptyView")?.props.description).toBe(
    "Type a word to find a block by name, from the last 7 days to the next 30.",
  );
});

it("keeps displaying results for a non-empty query (the fix does not over-correct)", () => {
  mock.events = [hit];
  typeIntoSearchBar(render(), "standup");
  let tree = render();
  expect(tree.filter((n) => n.type === "Item")).toHaveLength(1);

  // Switching to another non-empty query still resolves and renders its hits.
  mock.events = [{ id: "e2", name: "Deep work", date: "2026-09-22", start: "10:00", end: "12:00" }];
  typeIntoSearchBar(tree, "deep");
  tree = render();
  expect(tree.filter((n) => n.type === "Item")).toHaveLength(1);
  expect(tree.find((n) => n.type === "Item")?.props.title).toBe("Deep work");
});

it.each(["", "   "])("ignores a retained API refusal for a blank query %j", (blank) => {
  const searchTree = render("standup");
  mock.error = { ok: false, code: "unauthenticated", message: "expired" };
  expect(render().some((node) => node.type === "refusalView")).toBe(true);

  // Clearing while an earlier response is arriving leaves that response cached.
  // The original search handler may already have queued this update.
  typeIntoSearchBar(searchTree, blank);
  const tree = render();
  expect(tree.some((node) => node.type === "refusalView")).toBe(false);
  expect(tree.find((node) => node.type === "EmptyView")?.props.title).toBe("Search your blocks");
  expect(mock.options?.execute).toBe(false);
});

it("disables fetching and loading when a pending query is cleared to whitespace", () => {
  mock.loading = true;
  let tree = render("standup");
  expect(tree.find((node) => node.type === List)?.props.isLoading).toBe(true);

  typeIntoSearchBar(tree, "   ");
  tree = render();
  expect(mock.options).toEqual({ execute: false, keepPreviousData: true });
  expect(tree.find((node) => node.type === List)?.props.isLoading).toBe(false);
  expect(tree.filter((node) => node.type === "Item")).toHaveLength(0);
  expect(tree.find((node) => node.type === "EmptyView")?.props.title).toBe("Search your blocks");
});

it("shows neutral 'Searching…' copy while the first in-flight fetch is pending", () => {
  // The fix must show a neutral loading state — not a bogus 'No matches' verdict.
  mock.pending = true;
  mock.loading = true;

  const tree = render("standup");

  expect(tree.find((n) => n.type === List)?.props.isLoading).toBe(true);
  const empty = tree.find((n) => n.type === "EmptyView");
  expect(empty?.props.title).toBe("Searching…");
  expect(empty?.props.description).toBe(`Finding blocks that match “standup”.`);
});

it("still shows 'No matches' once a non-empty query resolves with zero results", () => {
  // Guards against over-correction: a genuine empty result must keep its copy.
  mock.events = [];
  const tree = render("standup");

  expect(tree.filter((n) => n.type === "Item")).toHaveLength(0);
  const empty = tree.find((n) => n.type === "EmptyView");
  expect(empty?.props.title).toBe("No matches");
  expect(empty?.props.description).toBe(`Nothing matches “standup”.`);
});

it("switches from 'Searching…' to 'No matches' once an empty result resolves", () => {
  // First: in-flight window -> neutral copy.
  mock.pending = true;
  mock.loading = true;
  let tree = render("standup");
  expect(tree.find((n) => n.type === List)?.props.isLoading).toBe(true);
  expect(tree.find((n) => n.type === "EmptyView")?.props.title).toBe("Searching…");

  // Then: server answers with zero results -> definitive 'No matches' copy.
  mock.pending = false;
  mock.loading = false;
  mock.events = [];
  tree = render("standup");
  expect(tree.find((n) => n.type === List)?.props.isLoading).toBe(false);
  expect(tree.filter((n) => n.type === "Item")).toHaveLength(0);
  expect(tree.find((n) => n.type === "EmptyView")?.props.title).toBe("No matches");
  expect(tree.find((n) => n.type === "EmptyView")?.props.description).toBe(`Nothing matches “standup”.`);
});

it("keeps the search bar editable when a search fails", () => {
  mock.error = { ok: false, code: "network", message: "offline" };
  const tree = render("standup");

  // A network error must not swap in a bare List that drops the query.
  expect(tree.some((n) => n.type === "refusalView")).toBe(false);
  const list = tree.find((n) => n.type === List);
  expect(list?.props.searchText).toBe("standup");
  expect(list?.props.onSearchTextChange).toBeTypeOf("function");
  const empty = tree.find((n) => n.type === "EmptyView");
  expect(empty?.props.title).toBe("Could not search");
  expect(empty?.props.description).toBe("offline");
  const retry = tree.find((n) => n.props.title === "Try Again");
  retry?.props.onAction?.();
  expect(mock.revalidate).toHaveBeenCalledTimes(1);

  // The user can edit the failed query.
  typeIntoSearchBar(tree, "stand");
  mock.error = undefined;
  expect(render().find((n) => n.type === "Item")?.props.title).toBe("Standup");
});

it.each(["unauthenticated", "permission", "scope"] as const)("sends a %s refusal to the gate view", (code) => {
  mock.error = { ok: false, code, message: "no" };
  expect(render("standup").some((n) => n.type === "refusalView")).toBe(true);
});
