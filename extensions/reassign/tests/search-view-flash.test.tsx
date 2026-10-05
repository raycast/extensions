import { beforeEach, expect, it, vi } from "vitest";

// Faithful model of the `useCachedPromise` / `usePromise` interaction that the
// shipped mock in `tests/search-view.test.tsx` cannot express. The real hook
// holds `isLoading` in a `useState` that starts `true` only on first mount, and
// the transition back to `true` on a new fetch happens inside `callback()`,
// called from a passive `useEffect` that runs *after* React commits. With
// `keepPreviousData`, the intermediate pre-effect commit republishes the previous
// query's resolved payload (`laggyDataRef.current`) as `data` while `isLoading`
// still carries the previous settled value. These tests drive that flow by hand
// (`render` → `advanceEffects` → `resolveFetch`) and assert the EmptyView copy
// never reaches a definitive verdict for a query the server has not been asked
// about. The shipped suite stubs `useEffect` to `() => undefined` and resolves
// synchronously, so the transitional frame is invisible there.

type SearchEvent = { id: string; name: string; date: string; start: string; end: string };
type OkData = { ok: true; data: { events: SearchEvent[] } };
type ErrorData = { ok: false; code: "network" | "unauthenticated" | "permission" | "scope"; message: string };
type Wrapped = { query: string; result: OkData | ErrorData };

const m = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  revalidate: vi.fn(),
  currentText: "",
  laggy: undefined as Wrapped | undefined,
  isLoadingState: true,
  inflightForQuery: null as string | null,
  lastEffectQuery: null as string | null,
  error: undefined as ErrorData | undefined,
  events: [] as SearchEvent[],
  options: undefined as { execute: boolean; keepPreviousData: boolean } | undefined,
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
  // Passive effect: the real hook's effect runs after the commit. We stub it to
  // a no-op and let the test fire it explicitly via `advanceEffects()`.
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

// Faithful `useCachedPromise` for the query-only shape. `data` is the tagged
// `{ query, result }` (SearchView wraps its call). `laggy` mirrors
// `laggyDataRef.current`. `isLoadingState` mirrors `state.isLoading`; on the
// intermediate commit after an args change it still holds the previous settled
// value, because the effect that flips it back to `true` runs after the commit.
// `execute: false` (empty query) forces `isLoading: false`, matching the real
// hook's `options.execute !== false ? state.isLoading : false`.
vi.mock("@raycast/utils", () => ({
  useCachedPromise: (_fn: unknown, _args: unknown[], options: { execute: boolean; keepPreviousData: boolean }) => {
    m.options = options;
    if (!options.execute) return { data: m.laggy, isLoading: false, revalidate: m.revalidate };
    return { data: m.laggy, isLoading: m.isLoadingState, revalidate: m.revalidate };
  },
}));

vi.mock("../src/lib/api", () => ({ searchEvents: vi.fn() }));
vi.mock("../src/components/states", () => ({ refusalView: vi.fn(() => ({ type: "refusalView", props: {} })) }));

import { List } from "@raycast/api";
import { refusalView } from "../src/components/states";
import { SearchView } from "../src/components/search-view";

type Node = {
  type: unknown;
  props: {
    children?: unknown;
    actions?: unknown;
    title?: string;
    description?: string;
    onAction?: () => void;
    isLoading?: boolean;
    searchText?: string;
    onSearchTextChange?: (v: string) => void;
  } & Record<string, unknown>;
};

function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in (value as Record<string, unknown>))) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions)];
}

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

function itemTitles(tree: Node[]): string[] {
  return tree
    .filter((n) => n.type === "Item")
    .map((n) => n.props.title)
    .filter((t): t is string => typeof t === "string");
}

function typeIntoSearchBar(tree: Node[], text: string) {
  const list = tree.find((n) => n.type === List);
  if (!list) throw new Error("List not rendered");
  const onChange = list.props.onSearchTextChange;
  if (typeof onChange !== "function") throw new Error("Search bar is not editable (no onSearchTextChange)");
  onChange(text);
  m.currentText = text;
}

// Fire the passive effect for the pending args change. Mirrors the real hook's
// `useEffect`: a no-op when deps are unchanged, otherwise `callback()` flips
// `state.isLoading` to `true` and starts the fetch. For `execute: false` the
// effect calls `abort()` instead, so no fetch starts and `isLoading` stays (and
// is forced to `false` on render).
function advanceEffects() {
  const q = m.currentText.trim();
  if (q.length === 0) {
    m.inflightForQuery = null;
    m.lastEffectQuery = q;
    return;
  }
  if (q === m.lastEffectQuery) return;
  m.isLoadingState = true;
  m.inflightForQuery = q;
  m.lastEffectQuery = q;
}

// Resolve the inflight fetch for the query the effect started. Mirrors the
// real hook's `set({ data, isLoading: false })` and `laggyDataRef.current = data`.
function resolveFetch(value: OkData | ErrorData) {
  if (m.inflightForQuery === null) throw new Error("advanceEffects() must start a fetch before resolveFetch()");
  m.laggy = { query: m.inflightForQuery, result: value };
  m.isLoadingState = false;
  m.inflightForQuery = null;
}

const standup: SearchEvent = { id: "e1", name: "Standup", date: "2026-09-22", start: "09:00", end: "09:30" };

beforeEach(() => {
  m.slots = [];
  m.cursor = 0;
  m.currentText = "";
  m.laggy = undefined;
  m.isLoadingState = true;
  m.inflightForQuery = null;
  m.lastEffectQuery = null;
  m.error = undefined;
  m.events = [standup];
  m.options = undefined;
  m.revalidate.mockReset();
  vi.mocked(refusalView).mockReset();
  vi.mocked(refusalView).mockImplementation(() => ({ type: "refusalView", props: {} }) as never);
});

it("FLASH #1: an edit after a 'No matches' verdict stays 'Searching…' on the pre-effect commit, then 'No matches' once the new query resolves", () => {
  // "abc" resolves with zero results.
  m.currentText = "abc";
  let tree = render("abc");
  expect(emptyTitle(tree)).toBe("Searching…");
  advanceEffects();
  tree = render("abc");
  expect(listIsLoading(tree)).toBe(true);
  resolveFetch({ ok: true, data: { events: [] } });
  tree = render("abc");
  expect(emptyTitle(tree)).toBe("No matches");
  expect(emptyDesc(tree)).toBe(`Nothing matches “abc”.`);

  // Edit to "ab". On the intermediate pre-effect commit the previous query's
  // empty success was republished as `data` while `isLoading` was still false;
  // before the fix this flashed "No matches" for "ab" before its fetch began.
  typeIntoSearchBar(tree, "ab");
  tree = render("ab");
  expect(emptyTitle(tree)).toBe("Searching…");
  expect(emptyDesc(tree)).toBe(`Finding blocks that match “ab”.`);
  expect(listIsLoading(tree)).toBe(false);

  // The passive effect fires: isLoading flips to true, copy stays neutral.
  advanceEffects();
  tree = render("ab");
  expect(emptyTitle(tree)).toBe("Searching…");
  expect(listIsLoading(tree)).toBe(true);

  // "ab" also resolves with zero results -> the verdict correctly returns.
  resolveFetch({ ok: true, data: { events: [] } });
  tree = render("ab");
  expect(emptyTitle(tree)).toBe("No matches");
  expect(emptyDesc(tree)).toBe(`Nothing matches “ab”.`);
});

it("FLASH #2: an edit after a non-gate failure stays 'Searching…' on the pre-effect commit (no stale 'Could not search' with the old message), then re-verdicts once the new query resolves", () => {
  // "abc" resolves with a non-gate network failure.
  m.currentText = "abc";
  let tree = render("abc");
  advanceEffects();
  resolveFetch({ ok: false, code: "network", message: "Reassign did not answer in time." });
  tree = render("abc");
  expect(emptyTitle(tree)).toBe("Could not search");
  expect(emptyDesc(tree)).toBe("Reassign did not answer in time.");

  // Edit to "ab". On the intermediate commit the previous query's `{ok:false}`
  // was republished as `data` while `isLoading` was still false; before the fix
  // this flashed "Could not search" with the OLD message for a query the server
  // had not been asked about, and did not route to refusalView (non-gate code).
  typeIntoSearchBar(tree, "ab");
  tree = render("ab");
  expect(emptyTitle(tree)).toBe("Searching…");
  expect(emptyDesc(tree)).toBe(`Finding blocks that match “ab”.`);
  expect(listIsLoading(tree)).toBe(false);
  expect(refusalView).not.toHaveBeenCalled();

  // The passive effect fires, then "ab" resolves with zero results -> the
  // verdict correctly returns for the *new* query (and is not stuck on the
  // stale failure, nor stuck on "Searching…").
  advanceEffects();
  resolveFetch({ ok: true, data: { events: [] } });
  tree = render("ab");
  expect(emptyTitle(tree)).toBe("No matches");
  expect(emptyDesc(tree)).toBe(`Nothing matches “ab”.`);
});

it("keepPreviousData: the previous query's rows stay on screen through the intermediate commit (the deliberate row-preservation UX is not over-corrected)", () => {
  // "abc" resolves with a Standup row.
  m.currentText = "abc";
  let tree = render("abc");
  advanceEffects();
  resolveFetch({ ok: true, data: { events: [standup] } });
  tree = render("abc");
  expect(itemTitles(tree)).toEqual(["Standup"]);

  // Edit to "ab". The intermediate commit must still show the Standup row
  // (rows read from the laggy `data`), while the EmptyView copy that would
  // show if the list were empty is the neutral "Searching…" — not "No matches".
  typeIntoSearchBar(tree, "ab");
  tree = render("ab");
  expect(itemTitles(tree)).toEqual(["Standup"]);
  expect(emptyTitle(tree)).toBe("Searching…");

  // The new query resolves with a different row -> the row swaps over.
  advanceEffects();
  resolveFetch({
    ok: true,
    data: { events: [{ id: "e2", name: "Deep work", date: "2026-09-22", start: "10:00", end: "12:00" }] },
  });
  tree = render("ab");
  expect(itemTitles(tree)).toEqual(["Deep work"]);
});

it("first launch stays 'Searching…' (the 48b47dc guarantee is preserved) and never asserts 'No matches' before the first fetch resolves", () => {
  m.currentText = "abc";
  const tree = render("abc");
  expect(emptyTitle(tree)).toBe("Searching…");
  expect(listIsLoading(tree)).toBe(true);
  // No advanceEffects / resolveFetch yet: still neutral, never "No matches".
  expect(emptyTitle(render("abc"))).toBe("Searching…");
});

it("a revalidate after a non-gate failure flips back to 'Searching…' (no stale 'Could not search' while the retry is in flight)", () => {
  m.currentText = "abc";
  let tree = render("abc");
  advanceEffects();
  resolveFetch({ ok: false, code: "network", message: "offline" });
  tree = render("abc");
  expect(emptyTitle(tree)).toBe("Could not search");

  // Try Again: revalidate starts a new fetch for the current query.
  const retry = tree.find((n) => n.props.title === "Try Again");
  retry?.props.onAction?.();
  expect(m.revalidate).toHaveBeenCalledTimes(1);
  // Model the revalidate the way the real hook does: callback() flips isLoading
  // to true and starts a fetch for the current query.
  m.isLoadingState = true;
  m.inflightForQuery = "abc";
  m.lastEffectQuery = "abc";
  tree = render("abc");
  expect(emptyTitle(tree)).toBe("Searching…");
  expect(listIsLoading(tree)).toBe(true);
});
