import type { MockValue } from "./load-ts.ts";
import type { TestNode } from "./render-ui.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { renderer, findAll } from "./render-ui.ts";

test("nested tabs refresh only the selected window, focus fresh targets, and can recover from empty and error states", async () => {
  const browser = { id: "chrome", appName: "Google Chrome", appPath: "/Chrome.app", engine: "chromium" };
  const original = { id: "10", title: "Old title", tabs: [{ id: "old", title: "Closed tab", url: "" }] };
  const fresh = { id: "10", title: "New title", tabs: [{ id: "new", title: "New tab", url: "https://new.example" }] };
  const foreign = { id: "11", title: "Other window", tabs: [{ id: "foreign", title: "Other tab", url: "" }] };
  let windows = [foreign, fresh];
  let data: MockValue, error: unknown, refresh: () => Promise<void>;
  let failure = false;
  const focused: MockValue[][] = [];
  const view = renderer(
    {},
    {
      "@raycast/utils": {
        useCachedPromise: (load, args, options) => {
          refresh = async () => {
            try {
              data = await load(...args);
              error = undefined;
            } catch (caught) {
              error = caught;
            }
          };
          return {
            data: data === undefined ? options.initialData : data,
            error,
            revalidate: refresh,
            isLoading: false,
          };
        },
      },
      "./browsers/registry": { getBrowserById: () => browser },
      "./browsers/client": {
        getBrowserWindows: async (...args) => {
          assert.deepEqual(args, [browser], "refresh must query live native metadata, not reuse a snapshot");
          if (failure) throw new Error("Browser unavailable");
          return windows;
        },
        focusBrowserTab: async (...args) => focused.push(args),
      },
    },
    "src/browser-windows.tsx",
    "BrowserTabsView",
    { browser, window: original },
  );
  const rows = () => findAll(view.render(), (node) => node.type === view.ui.List.Item);
  const refreshAction = (tree: TestNode) => findAll(tree, (node) => node.props.title === "Refresh List")[0];
  assert.equal(rows()[0].props.title, "Closed tab");
  const action = refreshAction(rows()[0]);
  assert(action, "nested rows must offer refresh");
  assert.equal(action.props.shortcut, view.ui.Keyboard.Shortcut.Common.Refresh);
  await action.props.onAction();
  assert.deepEqual(
    rows().map((row) => row.props.title),
    ["New tab"],
  );
  assert.equal(view.render().props.navigationTitle, "New title");
  const focus = findAll(rows()[0], (node) => node.props.title === "Switch to Tab")[0];
  await focus.props.onAction();
  assert.equal(focused[0][1], fresh);
  assert.equal(focused[0][2], fresh.tabs[0]);

  for (const next of [[foreign, { ...fresh, tabs: [] }], [foreign]]) {
    windows = next;
    await refreshAction(rows()[0] ?? view.render()).props.onAction();
    assert.equal(rows().length, 0, "closed windows must not retain stale tabs");
    const empty = findAll(view.render(), (node) => node.type === view.ui.List.EmptyView)[0];
    assert(refreshAction(empty), "empty lists must still offer refresh");
  }
  failure = true;
  await refreshAction(view.render()).props.onAction();
  const empty = findAll(view.render(), (node) => node.type === view.ui.List.EmptyView)[0];
  assert.equal(empty.props.description, "Browser unavailable");
  failure = false;
  windows = [fresh, foreign];
  await refreshAction(empty).props.onAction();
  assert.equal(rows()[0].props.title, "New tab");
});
