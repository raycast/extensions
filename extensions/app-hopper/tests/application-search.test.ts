import assert from "node:assert/strict";
import test from "node:test";
import type { AppListOrder } from "../src/app-groups";
import type { useApplicationSearch } from "../src/use-application-search";
import type { AppGroup } from "../src/windows";
import createLoader, { type MockValue } from "./load-ts.ts";

type SearchOptions = Parameters<typeof useApplicationSearch>[0];
type SearchView = ReturnType<typeof useApplicationSearch>;

function app(pid: number, name: string, space = 1): AppGroup {
  return {
    id: `pid:${pid}`,
    name,
    pids: [pid],
    windows: [{ id: pid * 10, pid, app: name, title: `${name} window`, space, frame: { x: 0, y: 0, w: 600, h: 400 } }],
  };
}

function searchHarness(apps: AppGroup[], order: AppListOrder = "recent") {
  let cursor = 0;
  let effects: (() => void)[] = [];
  const state: MockValue[] = [];
  const saved: { key: string; value: AppListOrder }[] = [];
  const useState = (initial: MockValue) => {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
    return [
      state[index],
      (next: MockValue) => {
        state[index] = typeof next === "function" ? next(state[index]) : next;
      },
    ];
  };
  const load = createLoader({
    react: {
      useState,
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useLayoutEffect: (effect) => effects.push(effect),
    },
    "@raycast/utils": {
      useCachedState: (key: string) => {
        const [value, setValue] = useState(order);
        return [
          value,
          (next: AppListOrder) => {
            saved.push({ key, value: next });
            setValue(next);
          },
        ];
      },
    },
  });
  const useSearch = load("src/use-application-search.ts").useApplicationSearch as typeof useApplicationSearch;
  let refreshes = 0;
  const options: SearchOptions = {
    apps,
    data: { browserTabs: {}, browserCounts: {}, axWindowsByPid: {} },
    onRefresh: () => {
      refreshes++;
    },
  };
  return {
    options,
    saved,
    get refreshes() {
      return refreshes;
    },
    render() {
      cursor = 0;
      effects = [];
      const view = useSearch(options);
      for (const effect of effects) effect();
      return view;
    },
  };
}

const rows = (view: SearchView) => view.groups.flatMap((group) => group.items);
const titles = (view: SearchView) =>
  rows(view).map(({ item }) => {
    if (item.kind === "app") return item.app.name;
    if (item.kind === "tab") return item.tab.title;
    return item.window.title;
  });

test("application search owns typing, enrichment, live targets, disappearance and refresh as one interaction", () => {
  const hook = searchHarness([app(1, "Safari")], "name");
  const original = { id: "10:ax:one", title: "Reference", url: "https://github.com/one" };
  const fresh = { id: "10:ax:two", title: "GitHub docs", url: "https://example.com" };
  const browserWindow = { id: "10", title: "Work", tabs: [original] };
  hook.options.data.browserTabs = { safari: [browserWindow] };

  hook.render().listProps.onSearchTextChange("github");
  // Enrichment can arrive between typing and the next render, before a selection event.
  hook.options.data.browserTabs = { safari: [{ ...browserWindow, tabs: [fresh, original] }] };
  const enriched = hook.render();
  assert.deepEqual(titles(enriched), ["Reference", "GitHub docs"]);
  assert.equal(enriched.hasQuery, true);
  assert.equal(enriched.hasResults, true);
  const selectedId = rows(enriched)[0].item.id;
  enriched.listProps.onSelectionChange(selectedId);

  const latest = { ...original, title: "Renamed reference", url: "https://example.org" };
  const later = { id: "10:ax:three", title: "GitHub", url: "https://example.net" };
  hook.options.data.browserTabs = { safari: [{ ...browserWindow, tabs: [later, fresh, latest] }] };
  const updated = hook.render();
  assert.deepEqual(titles(updated), ["Renamed reference", "GitHub docs", "GitHub"]);
  assert.equal(updated.listProps.selectedItemId, selectedId);
  const target = rows(updated)[0].item;
  assert.equal(target.kind, "tab");
  if (target.kind !== "tab") assert.fail("expected the original tab target");
  assert.equal(target.tab, latest, "held rows use the exact live target even when it no longer matches the query");

  hook.options.data.browserTabs = { safari: [{ ...browserWindow, tabs: [later, fresh] }] };
  const missing = hook.render();
  assert.equal(rows(missing)[0].unavailable, true);
  assert.equal(rows(missing)[0].item.id, selectedId);
  assert.equal(missing.listProps.selectedItemId, selectedId);
  missing.refresh();
  const refreshed = hook.render();
  assert.equal(hook.refreshes, 1);
  assert.equal(refreshed.listProps.searchText, "github");
  assert.equal(refreshed.listProps.selectedItemId, undefined);
  assert.deepEqual(titles(refreshed), ["GitHub", "GitHub docs"]);
  assert.equal(
    rows(refreshed).some((row) => row.unavailable),
    false,
  );
  refreshed.listProps.onSearchTextChange("");
  const browsing = hook.render();
  assert.equal(browsing.hasQuery, false);
  assert.equal(browsing.arrangement.value, "name");
  assert.deepEqual(titles(browsing), ["Safari"]);
  assert.deepEqual(hook.saved, [], "typing, selection and refresh do not overwrite the saved arrangement");
});

test("application search holds Space sections on selection and resets them when arrangement changes", () => {
  const notes = app(1, "Notes", 1);
  const editor = app(2, "Editor", 2);
  const hook = searchHarness([notes, editor], "space");
  const initial = hook.render();
  initial.listProps.onSelectionChange(notes.id);
  hook.options.apps = [{ ...notes, windows: [{ ...notes.windows[0], space: 3 }] }, editor];
  const held = hook.render();
  assert.deepEqual(
    held.groups.map((group) => group.title),
    ["Space 1", "Space 2"],
  );
  assert.equal(held.listProps.selectedItemId, notes.id);
  held.arrangement.onChange("space");
  const regrouped = hook.render();
  assert.deepEqual(
    regrouped.groups.map((group) => group.title),
    ["Space 2", "Space 3"],
  );
  assert.equal(regrouped.listProps.selectedItemId, undefined);
  assert.deepEqual(hook.saved, [{ key: "app-list-order", value: "space" }]);
  assert.equal(hook.refreshes, 0, "changing arrangement must not start another native query");
});

test("application search follows incoming app order until interaction and clears vanished rows on a new query", () => {
  const notes = app(1, "Notes");
  const editor = app(2, "Editor");
  const hook = searchHarness([notes, editor]);
  assert.deepEqual(titles(hook.render()), ["Notes", "Editor"]);
  hook.options.apps = [editor, notes];
  const reordered = hook.render();
  assert.deepEqual(titles(reordered), ["Editor", "Notes"]);
  reordered.listProps.onSelectionChange(editor.id);
  hook.options.apps = [notes];
  assert.equal(rows(hook.render())[0].unavailable, true);
  hook.render().listProps.onSearchTextChange("missing");
  const empty = hook.render();
  assert.deepEqual(empty.groups, []);
  assert.equal(empty.hasQuery, true);
  assert.equal(empty.hasResults, false);
  assert.equal(empty.listProps.selectedItemId, undefined);
  empty.listProps.onSearchTextChange("  ");
  const browsing = hook.render();
  assert.equal(browsing.hasQuery, false);
  assert.deepEqual(titles(browsing), ["Notes"]);
});
