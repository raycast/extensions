const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
function load(file, mocks) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, { exports, require: (id) => (Object.hasOwn(mocks, id) ? mocks[id] : require(id)), console });
  return exports;
}
const { scriptSelectedPickerPaths } = load("src/utils/picker-selection.ts", {
  "@raycast/api": {},
  "@raycast/utils": {},
});
const el = (attrs) => ({ attrs });
const item = (url) => el({ AXRole: "AXGroup", AXChildren: [el({ AXRole: "AXImage", AXURL: url })] });
function inspect(id, selected, visible = [item("file:///tmp/not-selected.png")]) {
  const panel = el({
    AXIdentifier: id,
    AXChildren: [el({ AXIdentifier: "IconView", AXRole: "AXList", AXSelectedChildren: selected, AXChildren: visible })],
  });
  return inspectPanel(panel);
}
function inspectPanel(panel) {
  const root = el({ AXFocusedWindow: panel });
  const array = (values) => ({ count: values.length, objectAtIndex: (i) => values[i] });
  const $ = (v) => v;
  $.AXUIElementCreateApplication = () => root;
  $.AXUIElementSetMessagingTimeout = () => 0;
  $.AXUIElementCopyAttributeValue = (node, key, ref) => {
    const v = node.attrs[key];
    if (v === undefined) return -25212;
    ref[0] = Array.isArray(v) ? array(v) : v;
    return 0;
  };
  $.NSRunningApplication = { runningApplicationsWithBundleIdentifier: () => array([{ processIdentifier: 1 }]) };
  $.NSURL = {
    URLWithString: (raw) => {
      const u = new URL(raw);
      const resolved = u.pathname.startsWith("/.file/") ? "/tmp/selected image.png" : decodeURIComponent(u.pathname);
      return { isFileURL: u.protocol === "file:", filePathURL: { path: resolved } };
    },
  };
  return JSON.parse(
    vm.runInNewContext(scriptSelectedPickerPaths("example.host"), {
      $,
      Ref: () => [],
      ObjC: { import() {}, bindFunction() {}, unwrap: (v) => v },
    }),
  );
}
test("resolves the selected icon image reference, not another visible file", () => {
  assert.deepEqual(inspect("open-panel", [item("file:///.file/id=123.456")]), ["/tmp/selected image.png"]);
});
test("copies multiple selected paths and decodes names", () => {
  assert.deepEqual(inspect("open-panel", [item("file:///tmp/one%20file"), item("file:///tmp/%E6%97%A5.png")]), [
    "/tmp/one file",
    "/tmp/日.png",
  ]);
});
test("no selection does not infer a folder from visible entries", () =>
  assert.deepEqual(inspect("open-panel", []), []));
test("Go To, Save panels and normal windows do not trigger selection copying", () => {
  for (const id of ["GoToWindow", "save-panel", "ordinary-window"])
    assert.deepEqual(inspect(id, [item("file:///tmp/file")]), []);
});
test("unreadable partial selection is not copied", () =>
  assert.deepEqual(inspect("open-panel", [item("file:///tmp/one"), el({ AXRole: "AXGroup" })]), []));
test("does not accept website URLs from selected elements", () =>
  assert.deepEqual(inspect("open-panel", [item("https://example.com")]), []));
async function route(bundleId, selected, windowPath = "", url = "") {
  const calls = [];
  const noop = async () => {};
  const { default: command } = load("src/copy-path.tsx", {
    "@raycast/api": { closeMainWindow: noop, getFrontmostApplication: async () => ({ bundleId }) },
    "./utils/constants": { finderBundleId: "finder", qSpaceBundleId: "qspace" },
    "./utils/common-utils": {
      showLoadingHUD: noop,
      isEmpty: (v) => !v,
      copyFinderPath: async () => calls.push("finder"),
      copyQSpacePath: async () => calls.push("qspace"),
      copySelectedPickerPath: async () => {
        calls.push("picker");
        return selected;
      },
      copyWindowPath: async () => {
        calls.push("document");
        return windowPath;
      },
      copyBrowserTabUrl: async () => {
        calls.push("browser");
        return url;
      },
      copyUnSupportedAppContent: async () => calls.push("configured-fallback"),
    },
  });
  await command();
  return calls;
}
test("Finder and QSpace retain their dedicated command routing", async () => {
  assert.deepEqual(await route("finder", true), ["finder"]);
  assert.deepEqual(await route("qspace", true), ["qspace"]);
});
test("readable picker selection takes precedence in a host app", async () =>
  assert.deepEqual(await route("host", true), ["picker"]));
test("empty selection keeps document handling", async () =>
  assert.deepEqual(await route("host", false, "/tmp/document"), ["picker", "document"]));
test("empty selection keeps browser links", async () =>
  assert.deepEqual(await route("host", false, "", "https://example.com"), ["picker", "document", "browser"]));
test("empty selection keeps the configured unsupported action", async () =>
  assert.deepEqual(await route("host", false), ["picker", "document", "browser", "configured-fallback"]));
test("errors in the reader preserve the fallback path", async () => {
  const { getSelectedPickerPaths } = load("src/utils/picker-selection.ts", {
    "@raycast/api": {},
    "@raycast/utils": {
      runAppleScript: async () => {
        throw new Error("timeout");
      },
    },
  });
  assert.equal((await getSelectedPickerPaths({ bundleId: "host" })).length, 0);
});
test("native JXA syntax parses without inspecting apps", { skip: process.platform !== "darwin" }, () => {
  const { spawnSync } = require("node:child_process");
  const r = spawnSync(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", "new Function(" + JSON.stringify(scriptSelectedPickerPaths("host")) + '); "parsed";'],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
});

const openPanel = (children) => el({ AXIdentifier: "open-panel", AXChildren: children });
const column = (selected, attribute = "AXSelectedChildren") =>
  el({
    AXRole: "AXColumn",
    AXChildren: [el({ AXRole: "AXScrollArea", AXChildren: [el({ AXRole: "AXList", [attribute]: selected })] })],
  });
test("list view reads AXSelectedRows through row cells", () => {
  const row = el({
    AXRole: "AXRow",
    AXChildren: [el({ AXRole: "AXCell", AXChildren: [item("file:///tmp/list.png")] })],
  });
  assert.deepEqual(
    inspectPanel(openPanel([el({ AXIdentifier: "ListView", AXRole: "AXOutline", AXSelectedRows: [row] })])),
    ["/tmp/list.png"],
  );
});
test("list view supports AXSelectedChildren and deduplicates overlapping selection attributes", () => {
  const row = item("file:///tmp/list.png");
  assert.deepEqual(
    inspectPanel(
      openPanel([
        el({ AXIdentifier: "ListView", AXRole: "AXTable", AXSelectedRows: [row], AXSelectedChildren: [row] }),
      ]),
    ),
    ["/tmp/list.png"],
  );
});
test("column view reads the rightmost AXColumns selection, not an earlier folder", () => {
  const columns = [column([item("file:///tmp/parent-folder")]), column([item("file:///tmp/child.png")])];
  assert.deepEqual(
    inspectPanel(openPanel([el({ AXIdentifier: "ColumnView", AXRole: "AXBrowser", AXColumns: columns })])),
    ["/tmp/child.png"],
  );
});
test("nested AXBrowser column wrappers support multiple selected rows", () => {
  const columns = [
    column([item("file:///tmp/parent-folder")]),
    column([item("file:///tmp/a.png"), item("file:///tmp/b.png")], "AXSelectedRows"),
  ];
  const browser = el({ AXRole: "AXBrowser", AXChildren: [el({ AXRole: "AXScrollArea", AXChildren: columns })] });
  assert.deepEqual(inspectPanel(openPanel([browser])), ["/tmp/a.png", "/tmp/b.png"]);
});
test("AXBrowser ignores its ancestor selection when the last column has a file", () => {
  const browser = el({
    AXRole: "AXBrowser",
    AXSelectedChildren: [item("file:///tmp/parent-folder")],
    AXColumns: [column([item("file:///tmp/child.png")])],
  });
  assert.deepEqual(inspectPanel(openPanel([browser])), ["/tmp/child.png"]);
});
test("column order is preserved when wrappers have different nesting depths", () => {
  const parent = column([item("file:///tmp/parent-folder")]);
  const child = column([item("file:///tmp/child.png")]);
  const browser = el({
    AXRole: "AXBrowser",
    AXChildren: [el({ AXRole: "AXScrollArea", AXChildren: [parent] }), child],
  });
  assert.deepEqual(inspectPanel(openPanel([browser])), ["/tmp/child.png"]);
});
test("an incomplete column scan does not return an earlier folder", () => {
  const browser = el({
    AXRole: "AXBrowser",
    AXChildren: [
      column([item("file:///tmp/parent-folder")]),
      ...Array.from({ length: 40 }, () => el({ AXRole: "AXGroup" })),
      column([item("file:///tmp/child.png")]),
    ],
  });
  assert.deepEqual(inspectPanel(openPanel([browser])), []);
});
test("empty rightmost column does not copy a parent folder selection", () => {
  const browser = el({
    AXRole: "AXBrowser",
    AXSelectedChildren: [item("file:///tmp/parent-folder")],
    AXColumns: [column([item("file:///tmp/parent-folder")]), column([])],
  });
  assert.deepEqual(inspectPanel(openPanel([browser])), []);
});
test("unreadable last-column selection does not fall back to an earlier folder", () => {
  const browser = el({
    AXRole: "AXBrowser",
    AXColumns: [column([item("file:///tmp/parent-folder")]), column([item("file:///tmp/a"), el({ AXRole: "AXRow" })])],
  });
  assert.deepEqual(inspectPanel(openPanel([browser])), []);
});
test("sidebar selection cannot override the content list", () => {
  const sidebar = el({
    AXIdentifier: "sidebar",
    AXChildren: [el({ AXIdentifier: "ListView", AXRole: "AXOutline", AXSelectedRows: [item("file:///tmp/favourite")] })],
  });
  const content = el({ AXIdentifier: "ListView", AXRole: "AXOutline", AXSelectedRows: [item("file:///tmp/actual.png")] });
  assert.deepEqual(inspectPanel(openPanel([sidebar, content])), ["/tmp/actual.png"]);
});

test("list-view wrappers expose selected rows on their inner outline", () => {
  const outline = el({ AXRole: "AXOutline", AXSelectedRows: [item("file:///tmp/nested-list.png")] });
  const wrapper = el({ AXIdentifier: "ListView", AXRole: "AXScrollArea", AXChildren: [outline] });
  assert.deepEqual(inspectPanel(openPanel([wrapper])), ["/tmp/nested-list.png"]);
});
