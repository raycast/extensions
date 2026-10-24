import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { before, test, type TestContext } from "node:test";
import { pathToFileURL } from "node:url";
import { createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { SearchPage } from "../src/browser/service-types";
import type { BrowserEntry, Scope } from "../src/types";
import { effectiveShortcuts } from "../src/shortcuts";
import { previewImages, previewMatches } from "./fixtures/preview-images";

type HostProps = Record<string, unknown> & { children?: ReactNode };
const host = (name: string) => (props: HostProps) =>
  createElement(name, props, props.children);

// Raycast native views cannot run in Node. Keep component selection and actions real.
export const List = Object.assign(host("list"), {
  Section: host("section"),
  Item: Object.assign(
    (props: HostProps) =>
      createElement(
        "item",
        props,
        props.children,
        props.detail as ReactNode,
        props.actions as ReactNode,
      ),
    { Detail: host("detail") },
  ),
  Dropdown: Object.assign(host("dropdown"), { Item: host("dropdown-item") }),
  EmptyView: host("empty-view"),
});
export const Action = Object.assign(host("action"), { Push: host("push") });
export const ActionPanel = Object.assign(host("action-panel"), {
  Section: host("action-section"),
  Submenu: host("submenu"),
});
export const Icon = new Proxy<Record<string, string>>(
  {},
  {
    get: (_, name) => String(name),
  },
);
export const Color = Icon;
export const BrowserExtension = {};
export const environment = { canAccess: () => true };
export const Toast = { Style: { Success: "success", Failure: "failure" } };
export const Clipboard = { copy: async () => {} };
export const closeMainWindow = async () => {};
export const openExtensionPreferences = async () => {};
export const showToast = async () => {};
export const captureChromeContext = async () => null;
export const getPreferenceValues = (): Preferences => ({
  searchStrategy: "chrome",
  historyDays: "14",
  historyLimit: "1000",
  historyDisplayCount: "10",
  bookmarkDisplayCount: "10",
  topSuggestionsCount: "2",
  enableConsecutiveSearch: false,
  startupPreview: true,
  includeIncognito: false,
});
export const useShortcuts = () => ({
  ready: true,
  bindings: effectiveShortcuts({}),
});
export const useFavicons = () => undefined;
let page: SearchPage | undefined;
let previewEntry: BrowserEntry | undefined;
export const usePagePreview = (entry: BrowserEntry | undefined) => {
  previewEntry = entry;
  return { isLoading: false, refresh: () => {}, markdown: entry?.title };
};
export const useBrowserSearch = () => ({
  page,
  searching: false,
  service: {
    entry: ({ id }: { id: string }) => {
      const entry = page?.results.find(
        (result) => result.entry.id === id,
      )?.entry;
      assert.ok(entry);
      return entry;
    },
  },
  cancel: () => {},
  loadMore: () => {},
  selectProfile: () => {},
});

let SearchBrowser: typeof import("../src/components/search-browser").default;
before(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (
        specifier === "@raycast/api" ||
        (context.parentURL?.includes("/components/search-browser") &&
          [
            "../browser/chrome",
            "../hooks/use-shortcuts",
            "../hooks/use-browser-search",
            "../hooks/use-favicons",
            "../hooks/use-page-preview",
          ].includes(specifier))
      ) {
        return { url: pathToFileURL(__filename).href, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
  });
  try {
    ({ default: SearchBrowser } =
      await import("../src/components/search-browser"));
  } finally {
    hooks.deregister();
  }
});

function results(
  ids: string[],
  source: Exclude<Scope, "all"> = "tab",
): SearchPage {
  return {
    requestId: 1,
    version: 1,
    offset: 0,
    total: ids.length,
    results: ids.map((id) => ({
      entry: { id, source, title: id, url: `https://example.com/${id}` },
      titleRanges: [],
      urlRanges: [],
      score: 0,
    })),
  };
}

async function mount(t: TestContext) {
  page = results(["first", "second", "third"]);
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(createElement(SearchBrowser));
  });
  t.after(async () => act(async () => renderer.unmount()));
  return {
    list: () => renderer.root.findByType(List),
    update: async () =>
      act(async () => renderer.update(createElement(SearchBrowser))),
    renderer,
  };
}

test("selection callbacks update preview without being written back to List", async (t) => {
  const ui = await mount(t);
  assert.equal(previewEntry?.id, "first");
  for (const id of ["second", "third", "second"]) {
    await act(async () => ui.list().props.onSelectionChange(id));
    assert.equal(previewEntry?.id, id);
    assert.equal(ui.list().props.selectedItemId, undefined);
  }
  const second = ui.renderer.root
    .findAllByType(List.Item)
    .find((item) => item.props.id === "second");
  assert.ok(second);
  assert.equal(second.props.actions.props.resolve().id, "second");
});

test("new queries and replacement results keep the first result as the preview default", async (t) => {
  const ui = await mount(t);
  await act(async () => ui.list().props.onSelectionChange("third"));
  await act(async () => ui.list().props.onSearchTextChange("next"));
  assert.equal(previewEntry?.id, "first");
  assert.equal(ui.list().props.selectedItemId, undefined);

  page = results(["next-first", "next-second"]);
  await ui.update();
  assert.equal(previewEntry?.id, "next-first");
  await act(async () => ui.list().props.onSelectionChange("next-second"));
  assert.equal(previewEntry?.id, "next-second");
  assert.equal(ui.list().props.selectedItemId, undefined);
});

test("source changes and empty results do not retain the old preview entry", async (t) => {
  const ui = await mount(t);
  await act(async () => ui.list().props.onSelectionChange("third"));
  await act(async () =>
    ui.list().props.searchBarAccessory.props.onChange("bookmark"),
  );
  page = results(["bookmark-first", "bookmark-second"], "bookmark");
  await ui.update();
  assert.equal(previewEntry?.id, "bookmark-first");
  assert.equal(ui.list().props.selectedItemId, undefined);

  page = results([]);
  await act(async () => ui.list().props.onSelectionChange(null));
  await ui.update();
  assert.equal(previewEntry, undefined);
});

test("expanded preview follows the selected result's title and URL matches", async (t) => {
  const ui = await mount(t);
  page!.results[0].titleRanges = [[0, 1]];
  page!.results[0].urlRanges = [[8, 14]];
  page!.results[1].titleRanges = [[0, 2]];
  await ui.update();
  const expand = ui.renderer.root
    .findAllByType(Action)
    .find((action) => action.props.title === "Expand Preview");
  assert.ok(expand);
  await act(async () => expand.props.onAction());
  const markdown = () =>
    ui.renderer.root.findByType(List.Item.Detail).props.markdown as string;
  assert.deepEqual(previewImages(markdown()).map(previewMatches), [
    ["fi"],
    ["example"],
  ]);

  await act(async () => ui.list().props.onSelectionChange("second"));
  assert.deepEqual(previewImages(markdown()).map(previewMatches), [
    ["sec"],
    [],
  ]);

  page = results(["second"]);
  page.results[0].titleRanges = [[3, 5]];
  await ui.update();
  assert.deepEqual(previewImages(markdown()).map(previewMatches), [
    ["ond"],
    [],
  ]);
});
