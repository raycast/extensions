import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
import { act, create } from "react-test-renderer";
import ts from "typescript";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../src/", import.meta.url));

// Render the real commands, hooks and actions, replacing only the native host and search response.
async function harness(t, command, data, launchArguments = {}) {
  const host = (name) => (props) => React.createElement(name, props, props.children, props.actions, props.detail);
  const List = Object.assign(host("List"), {
    Item: host("List.Item"),
    Section: host("List.Section"),
    EmptyView: host("List.EmptyView"),
    Dropdown: Object.assign(host("List.Dropdown"), { Item: host("List.Dropdown.Item") }),
  });
  const Action = host("Action");
  for (const name of ["Open", "ShowInFinder", "OpenWith", "ToggleQuickLook", "CopyToClipboard", "Trash"]) {
    Action[name] = host(`Action.${name}`);
  }
  const api = {
    List,
    Action,
    ActionPanel: Object.assign(host("ActionPanel"), { Section: host("ActionPanel.Section") }),
    Icon: new Proxy({}, { get: (_, name) => name }),
    Keyboard: { Shortcut: { Common: { Remove: { modifiers: ["ctrl"], key: "x" } } } },
    getPreferenceValues: () => ({}),
  };
  let response = { data: { tookMicros: 500, ...data }, isLoading: false, indexing: false };
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const source = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    function localRequire(id) {
      if (id === "@raycast/api") return api;
      if (id === "@raycast/utils") return { useCachedState: (_, initial) => React.useState(initial) };
      if (id.endsWith("/use-fsearch")) return { useFSearch: () => response };
      if (id.endsWith("/file-detail")) return { FileDetail: host("FileDetail") };
      if (id.endsWith("/status-view")) return { StatusView: host("StatusView") };
      if (!id.startsWith(".")) return require(id);
      const base = resolve(dirname(path), id);
      return load(existsSync(`${base}.tsx`) ? `${base}.tsx` : `${base}.ts`);
    }
    new Function("require", "module", "exports", source)(localRequire, module, module.exports);
    return module.exports;
  }
  const Command = load(resolve(root, `${command}.tsx`)).default;
  const props = { fallbackText: "report", arguments: launchArguments };
  let renderer;
  await act(() => {
    renderer = create(React.createElement(Command, props));
  });
  t.after(() => act(() => renderer.unmount()));
  return {
    list: () => renderer.root.findByType("List").props,
    items: () => renderer.root.findAllByType("List.Item"),
    sections: () => renderer.root.findAllByType("List.Section"),
    empty: () => renderer.root.findAllByType("List.EmptyView"),
    showingDetails: () => renderer.root.findByType("List").props.isShowingDetail,
    toggleDetails: () =>
      act(() =>
        renderer.root
          .findAllByType("Action")
          .find((action) => action.props.title === "Show Details")
          .props.onAction(),
      ),
    trash: (path) => renderer.root.findAllByType("Action.Trash").find((action) => action.props.paths === path),
    confirmTrash: (path) =>
      act(() => {
        renderer.root
          .findAllByType("Action.Trash")
          .find((action) => action.props.paths === path)
          .props.onTrash(path);
      }),
    changeQuery: (text) => act(() => renderer.root.findByType("List").props.onSearchTextChange(text)),
    updateResults: (next) =>
      act(() => {
        response = { ...response, data: { tookMicros: 500, ...next } };
        renderer.update(React.createElement(Command, props));
      }),
  };
}

const hit = (path, kind = "file") => ({ path, kind, size: 0, mtime: 0, score: 1 });
const matches = (path) => ({
  path,
  matches: [
    { line: 1, text: "report one" },
    { line: 2, text: "report two" },
  ],
});

test("a successful trash immediately removes the file and updates the result count", async (t) => {
  const h = await harness(t, "search-files", { hits: [hit("/tmp/report.txt"), hit("/tmp/keep.txt")] });
  assert.equal(h.items().length, 2);
  assert.deepEqual(h.trash("/tmp/report.txt").props.shortcut, { modifiers: ["ctrl"], key: "x" });
  await h.confirmTrash("/tmp/report.txt");
  assert.deepEqual(
    h.items().map((item) => item.props.id),
    ["/tmp/keep.txt"],
  );
  assert.equal(h.sections()[0].props.subtitle, "1 result");
});

test("opening the trash action leaves results intact until native deletion succeeds", async (t) => {
  const h = await harness(t, "search-files", { hits: [hit("/tmp/report.txt")] });
  assert.equal(typeof h.trash("/tmp/report.txt").props.onTrash, "function");
  // A cancelled or failed native action does not invoke onTrash.
  await h.updateResults({ hits: [hit("/tmp/report.txt")] });
  assert.equal(h.items().length, 1);
});

test("late search responses and query changes cannot bring a trashed result back", async (t) => {
  const h = await harness(t, "search-files", { hits: [hit("/tmp/report.txt"), hit("/tmp/keep.txt")] });
  await h.confirmTrash("/tmp/report.txt");
  await h.changeQuery("different query");
  await h.updateResults({ hits: [hit("/tmp/report.txt"), hit("/tmp/new.txt")] });
  assert.deepEqual(
    h.items().map((item) => item.props.id),
    ["/tmp/new.txt"],
  );
});

test("trashing a folder also hides its descendants without hiding similarly named siblings", async (t) => {
  const h = await harness(t, "search-files", {
    hits: [hit("/tmp/report", "dir"), hit("/tmp/report/nested/file.txt"), hit("/tmp/reports/keep.txt")],
  });
  await h.confirmTrash("/tmp/report");
  assert.deepEqual(
    h.items().map((item) => item.props.id),
    ["/tmp/reports/keep.txt"],
  );
});

test("successive deletions reach the empty state and clear the details panel", async (t) => {
  const h = await harness(t, "search-files", { hits: [hit("/tmp/report.txt"), hit("/tmp/keep.txt")] });
  await h.toggleDetails();
  assert.equal(h.showingDetails(), true);
  await h.confirmTrash("/tmp/report.txt");
  await h.confirmTrash("/tmp/keep.txt");
  assert.equal(h.items().length, 0);
  assert.equal(h.sections()[0].props.subtitle, "0 results");
  assert.equal(h.empty()[0].props.title, "No Results");
  assert.equal(h.showingDetails(), false);
});

test("trashing a content result removes every matching line and its section", async (t) => {
  const h = await harness(t, "search-contents", {
    files: [matches("/tmp/report.txt"), matches("/tmp/keep.txt")],
    complete: true,
  });
  assert.equal(h.items().length, 4);
  await h.confirmTrash("/tmp/report.txt");
  assert.deepEqual(
    h.items().map((item) => item.props.id),
    ["/tmp/keep.txt:1", "/tmp/keep.txt:2"],
  );
  assert.deepEqual(
    h.sections().map((section) => section.props.title),
    ["500 µs · keep.txt"],
  );
  await h.changeQuery("different query");
  await h.updateResults({ files: [matches("/tmp/report.txt"), matches("/tmp/keep.txt")], complete: true });
  assert.equal(h.items().length, 2);
  await h.confirmTrash("/tmp/keep.txt");
  assert.equal(h.items().length, 0);
  assert.equal(h.empty()[0].props.title, "No Matches");
});

test("trashing results preserves root-search arguments and the search timing", async (t) => {
  const h = await harness(
    t,
    "search-files",
    { hits: [hit("/tmp/report.txt"), hit("/tmp/keep.txt")] },
    { query: "invoice", kind: "doc", folder: "~/Documents" },
  );
  await h.confirmTrash("/tmp/report.txt");
  assert.equal(h.list().searchText, "invoice");
  assert.equal(h.list().navigationTitle, "Search Files in Documents");
  assert.equal(h.sections()[0].props.title, "500 µs");
  assert.equal(h.sections()[0].props.subtitle, "~/Documents · 1 result");
});
