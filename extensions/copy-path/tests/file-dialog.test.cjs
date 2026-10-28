const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");

function loadSource(file, mocks) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      return require(name);
    },
    console,
  });
  return exports;
}
const { scriptFileDialogPaths } = loadSource("src/utils/file-dialog.ts", {
  "@raycast/api": {},
  "@raycast/utils": {},
});
const app = { name: "Host", bundleId: "example.host", path: "/Applications/Host.app" };
const node = (attributes) => ({ attributes });
const panel = (attributes = {}) => node({ AXIdentifier: "open-panel", ...attributes });
const file = (url) => node({ AXURL: url });

function inspect(focusedWindow, mainWindow = null) {
  const root = node({ AXFocusedWindow: focusedWindow, AXMainWindow: mainWindow });
  const array = (items) => ({ count: items.length, objectAtIndex: (i) => items[i] });
  const $ = (value) => value;
  $.NSURL = {
    URLWithString: (raw) => {
      try {
        const url = new URL(raw);
        return { isFileURL: url.protocol === "file:", host: url.hostname, path: decodeURIComponent(url.pathname) };
      } catch {
        return null;
      }
    },
  };
  $.NSRunningApplication = { runningApplicationsWithBundleIdentifier: () => array([{ processIdentifier: 42 }]) };
  $.AXUIElementCreateApplication = () => root;
  $.AXUIElementSetMessagingTimeout = () => 0;
  $.AXUIElementCopyAttributeValue = (element, key, ref) => {
    const value = element.attributes[key];
    if (value === undefined) return -25212;
    ref[0] = Array.isArray(value) ? array(value) : value;
    return 0;
  };
  const output = vm.runInNewContext(scriptFileDialogPaths(app), {
    $,
    Ref: () => [],
    ObjC: { import() {}, bindFunction() {}, unwrap: (v) => v },
  });
  return JSON.parse(output);
}

test("reads a standalone picker instead of the underlying browser document", () => {
  assert.deepEqual(inspect(panel({ AXURL: "file:///tmp/picker/" }), node({ AXDocument: "file:///tmp/wrong" })), {
    detected: true,
    paths: ["/tmp/picker/"],
  });
});
test("recognizes save sheets attached to the focused window", () => {
  assert.deepEqual(
    inspect(
      node({
        AXDocument: "file:///tmp/behind",
        AXSheets: [panel({ AXIdentifier: "save-panel", AXDocument: "file:///tmp/save%20here/" })],
      }),
    ),
    { detected: true, paths: ["/tmp/save here/"] },
  );
});
test("finds a picker exposed as a child sheet", () => {
  assert.deepEqual(inspect(node({ AXChildren: [panel({ AXRole: "AXSheet", AXURL: "file:///tmp/sheet/" })] })), {
    detected: true,
    paths: ["/tmp/sheet/"],
  });
});
test("prefers selected files, deduplicates URLs and decodes Unicode", () => {
  const selected = node({ AXChildren: [file("file:///tmp/%E6%97%A5%20one.png")] });
  assert.deepEqual(
    inspect(
      panel({
        AXURL: "file:///tmp/",
        AXChildren: [
          node({
            AXIdentifier: "NSNavOutlineView",
            AXSelectedRows: [selected, file("file:///tmp/two.png")],
            AXSelectedChildren: [selected],
          }),
        ],
      }),
    ),
    { detected: true, paths: ["/tmp/日 one.png", "/tmp/two.png"] },
  );
});
test("does not treat selected sidebar favourites as selected files", () => {
  assert.deepEqual(
    inspect(
      panel({
        AXURL: "file:///tmp/current/",
        AXChildren: [
          node({
            AXIdentifier: "sidebar",
            AXChildren: [
              node({ AXIdentifier: "NSNavOutlineView", AXSelectedRows: [file("file:///tmp/wrong-favourite/")] }),
            ],
          }),
        ],
      }),
    ),
    { detected: true, paths: ["/tmp/current/"] },
  );
});
test("empty or virtual picker stays detected rather than falling through", () => {
  assert.deepEqual(inspect(panel()), { detected: true, paths: [] });
});
test("ignores non-file and remote-host URLs", () => {
  assert.deepEqual(inspect(panel({ AXURL: "https://example.com", AXDocument: "file://other-machine/private" })), {
    detected: true,
    paths: [],
  });
});
test("normal windows and unrelated sheets do not trigger picker behavior", () => {
  assert.deepEqual(
    inspect(node({ AXDocument: "file:///tmp/document", AXSheets: [node({ AXIdentifier: "print-panel" })] })),
    { detected: false, paths: [] },
  );
});
test("does not use an unrelated main window when the focused window is missing", () => {
  assert.deepEqual(inspect(null, panel({ AXURL: "file:///tmp/background/" })), { detected: false, paths: [] });
});

for (const detected of [true, false]) {
  test(`command routes ${detected ? "picker" : "ordinary browser"} before existing fallbacks`, async () => {
    const calls = [];
    const noop = async () => {};
    const { default: command } = loadSource("src/copy-path.tsx", {
      "@raycast/api": { closeMainWindow: noop, getFrontmostApplication: async () => app },
      "./utils/constants": {},
      "./utils/common-utils": {
        showLoadingHUD: noop,
        copyFileDialogPath: async () => {
          calls.push("picker");
          return detected;
        },
        copyWindowPath: async () => {
          calls.push("document");
          return "";
        },
        copyBrowserTabUrl: async () => {
          calls.push("browser");
          return "https://example.com";
        },
        isEmpty: (value) => !value,
      },
    });
    await command();
    assert.deepEqual(calls, detected ? ["picker"] : ["picker", "document", "browser"]);
  });
}

test("picker failure and unreadable location leave the clipboard unchanged and stop fallback", async () => {
  for (const result of [{ detected: true, paths: [] }, new Error("timeout")]) {
    const writes = [];
    const failures = [];
    const noop = async () => {};
    const utils = loadSource("src/utils/common-utils.ts", {
      "./applescript-utils": {},
      "./constants": {},
      "./file-dialog": {
        getFileDialogPaths: async () => {
          if (result instanceof Error) throw result;
          return result;
        },
      },
      "../types/preferences": { showCopyTip: true },
      "@raycast/api": {
        Clipboard: { copy: async (value) => writes.push(value) },
        Toast: { Style: { Failure: "failure" } },
        showToast: async (value) => failures.push(value),
        showHUD: noop,
        getPreferenceValues: () => ({}),
      },
    });
    assert.equal(await utils.copyFileDialogPath(app), true);
    assert.deepEqual(writes, []);
    assert.equal(failures.length, 1);
  }
});

test("picker copy respects the separator and home-directory preference", async () => {
  const os = require("node:os");
  const home = os.homedir();
  const writes = [];
  const noop = async () => {};
  const utils = loadSource("src/utils/common-utils.ts", {
    "./applescript-utils": {},
    "./constants": {},
    "./file-dialog": {
      getFileDialogPaths: async () => ({
        detected: true,
        paths: [home + "/first.png", home + "-another-user/second.png"],
      }),
    },
    "../types/preferences": { multiPathSeparator: ";", showCopyTip: false },
    "@raycast/api": {
      Clipboard: { copy: async (value) => writes.push(value) },
      getPreferenceValues: () => ({ useTildeForHome: true }),
      showHUD: noop,
      updateCommandMetadata: noop,
    },
  });
  assert.equal(await utils.copyFileDialogPath(app), true);
  assert.deepEqual(writes, ["~/first.png;" + home + "-another-user/second.png"]);
});

test("generated JavaScript parses in the native JXA runtime without inspecting apps", () => {
  const { spawnSync } = require("node:child_process");
  const result = spawnSync(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", "new Function(" + JSON.stringify(scriptFileDialogPaths(app)) + '); "parsed";'],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "parsed");
});

test("reads selected items inside a column-view browser list", () => {
  assert.deepEqual(
    inspect(
      panel({
        AXURL: "file:///tmp/",
        AXChildren: [
          node({
            AXRole: "AXBrowser",
            AXChildren: [node({ AXRole: "AXList", AXSelectedChildren: [file("file:///tmp/selected.png")] })],
          }),
        ],
      }),
    ),
    { detected: true, paths: ["/tmp/selected.png"] },
  );
});
