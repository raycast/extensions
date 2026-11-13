const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const os = require("node:os");
function load(file, mocks = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, { exports, require: (id) => (Object.hasOwn(mocks, id) ? mocks[id] : require(id)), console });
  return exports;
}
const formatting = load("src/utils/path-format.ts");
test("separator preferences preserve newlines, including previously saved values", () => {
  const manifest = require("../package.json");
  const preference = manifest.preferences.find((p) => p.name === "multiPathSeparator");
  for (const separator of [preference.default, ...preference.data.map((item) => item.value), "\n"]) {
    const preferences = load("src/types/preferences.ts", {
      "@raycast/api": { getPreferenceValues: () => ({ multiPathSeparator: separator }) },
    });
    const expected = separator === "\\n" ? "\n" : separator;
    assert.equal(["/tmp/a", "/tmp/b"].join(preferences.multiPathSeparator), "/tmp/a" + expected + "/tmp/b");
  }
});
test("HUD indicates the additional count, including when emoji is hidden", () => {
  assert.equal(formatting.formatPathHUD(["/tmp/a"], "📄"), "📄 /tmp/a");
  assert.equal(formatting.formatPathHUD(["/tmp/a", "/tmp/b", "/tmp/c"], "📄"), "📑 /tmp/a (+2)");
  assert.equal(formatting.formatPathHUD(["/tmp/a", "/tmp/b"], "📄", false), "/tmp/a (+1)");
});
test("tilde replacement respects home directory boundaries", () => {
  assert.equal(formatting.formatHomePath("/Users/test/a", true, "/Users/test"), "~/a");
  assert.equal(formatting.formatHomePath("/Users/test-other/a", true, "/Users/test"), "/Users/test-other/a");
  assert.equal(formatting.formatHomePath("/Users/test/a", false, "/Users/test"), "/Users/test/a");
});
function context({ tip = true, emoji = true, useTilde = true, urls = "", selected = [] } = {}) {
  const copies = [],
    huds = [];
  const utils = load("src/utils/common-utils.ts", {
    "./path-format": formatting,
    "./picker-selection": { getSelectedPickerPaths: async () => selected },
    "./applescript-utils": {
      getQSpacePathUrls: async () => urls,
      getFocusFinderPath: async () => os.homedir(),
      getFocusWindowTitle: async () => "Settings",
    },
    "./constants": {},
    "../types/preferences": {
      showHudEmoji: emoji,
      showCopyTip: tip,
      showLastCopy: false,
      multiPathSeparator: ";",
      copyWhenUnSupported: "windowTitle",
    },
    "@raycast/api": {
      getPreferenceValues: () => ({ useTildeForHome: useTilde }),
      updateCommandMetadata: async () => {},
      Clipboard: { copy: async (value) => copies.push(value) },
      getSelectedFinderItems: async () => selected.map((path) => ({ path })),
      showHUD: async (value) => huds.push(value),
    },
  });
  return { utils, copies, huds };
}
test("QSpace decodes each path and applies tilde to every copied item", async () => {
  const { pathToFileURL } = require("node:url");
  const paths = [os.homedir() + "/one file.png", os.homedir() + "/日.png"];
  const c = context({ urls: paths.map((p) => pathToFileURL(p).href).join("\n") });
  await c.utils.copyQSpacePath();
  assert.deepEqual(c.copies, ["~/one file.png;~/日.png"]);
  assert.deepEqual(c.huds, ["📑 ~/one file.png (+1)"]);
});
test("QSpace preserves remote URLs", async () => {
  const c = context({ urls: "sftp://example.com/folder/file.png", useTilde: false });
  await c.utils.copyQSpacePath();
  assert.deepEqual(c.copies, ["sftp://example.com/folder/file.png"]);
});
for (const handler of ["copyFinderPath", "copySelectedPickerPath"]) {
  test(handler + " uses the same multi-item HUD without changing copied content", async () => {
    const c = context({ selected: [os.homedir() + "/a", os.homedir() + "/b"], emoji: false });
    await c.utils[handler]({});
    assert.deepEqual(c.copies, ["~/a;~/b"]);
    assert.deepEqual(c.huds, ["~/a (+1)"]);
  });
}
test("emoji preference applies to unsupported-app fallback too", async () => {
  const c = context({ emoji: false });
  await c.utils.copyUnSupportedAppContent({});
  assert.deepEqual(c.copies, ["Settings"]);
  assert.deepEqual(c.huds, ["Settings"]);
});
test(
  "QSpace AppleScript compiles against the installed scripting dictionary",
  { skip: process.platform !== "darwin" || !fs.existsSync("/Applications/QSpace Pro.app") },
  () => {
    const { scriptQSpacePath } = load("src/utils/applescript-utils.ts", { "@raycast/api": {}, "@raycast/utils": {} });
    const { spawnSync } = require("node:child_process");
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "copy-path-script-check-"));
    try {
      const r = spawnSync("/usr/bin/osacompile", ["-o", path.join(temp, "check.scpt"), "-"], {
        input: scriptQSpacePath,
        encoding: "utf8",
      });
      assert.equal(r.status, 0, r.stderr);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  },
);

test("long display paths retain the filename ending and additional count", () => {
  const long = "/Users/test/Downloads/Pasted 2026-10-28 at 5.20.47 AM.textClipping";
  const hud = formatting.formatPathHUD([long, "/tmp/other"], "📄", false);
  assert.ok(hud.length <= 48);
  assert.ok(hud.includes("…"));
  assert.ok(hud.endsWith(".textClipping (+1)"));
  assert.ok(hud.startsWith("/Users/test/"));
});
test("long-path display leaves the copied path intact", async () => {
  const long = "/tmp/" + "long-file-name-".repeat(12) + ".png";
  const c = context({ selected: [long, "/tmp/second.png"], useTilde: false });
  await c.utils.copySelectedPickerPath({});
  assert.deepEqual(c.copies, [long + ";/tmp/second.png"]);
  assert.ok(c.huds[0].endsWith(".png (+1)"));
});
test("single long paths retain the ending too", () => {
  const hud = formatting.formatPathHUD(["/tmp/" + "a".repeat(150) + ".png"], "📄");
  assert.ok(hud.endsWith(".png"));
  assert.ok(hud.includes("…"));
});
test("short path messages remain unchanged", () => {
  assert.equal(
    formatting.formatPathHUD(["~/Downloads/IMG_0544.PNG", "/tmp/b"], "📄", false),
    "~/Downloads/IMG_0544.PNG (+1)",
  );
});
test("disabled copy tips suppress HUDs regardless of the emoji preference", async () => {
  const c = context({ tip: false, emoji: true, selected: ["/tmp/a", "/tmp/b"] });
  await c.utils.copySelectedPickerPath({});
  assert.deepEqual(c.copies, ["/tmp/a;/tmp/b"]);
  assert.deepEqual(c.huds, []);
});

test("long filenames keep a normal directory intact", () => {
  const directory = "/Users/test/Downloads/";
  const long = directory + "Pasted 2026-10-28 at 5.20.47 AM.textClipping";
  const hud = formatting.formatPathHUD([long, "/tmp/second"], "📄", false);
  assert.ok(hud.startsWith(directory + "Pasted"), hud);
  assert.ok(hud.endsWith(".textClipping (+1)"), hud);
  assert.ok(hud.length <= 48);
});
test("very long directories leave room for the filename and count", () => {
  const long = "/Users/test/" + "long-directory/".repeat(20) + "report.pdf";
  const hud = formatting.formatPathHUD([long, "/tmp/other"], "📄", false);
  assert.ok(hud.endsWith("/report.pdf (+1)"), hud);
  assert.ok(hud.includes("…"));
  assert.ok(hud.length <= 48);
});
test("truncation stays within the budget with non-BMP characters", () => {
  const long = "/tmp/" + "😀".repeat(100) + ".png";
  const hud = formatting.formatPathHUD([long, "/tmp/other"], "📄");
  assert.ok(hud.length <= 48);
  assert.equal(hud.isWellFormed(), true);
  assert.ok(hud.endsWith(".png (+1)"));
});

test("external-drive paths leave display headroom for the filename ending and count", () => {
  const long = "/Volumes/2TB/02_Photo-Work/Long project name/exported/source_Nik_DxO-Edit_DxO.tif";
  for (const emoji of [true, false]) {
    const hud = formatting.formatPathHUD([long, "/tmp/other"], "📄", emoji);
    assert.ok(hud.length <= 48, hud);
    assert.ok(hud.endsWith(".tif (+1)"), hud);
    assert.ok(!hud.includes("//"), hud);
  }
});
