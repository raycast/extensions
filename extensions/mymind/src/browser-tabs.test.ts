import { strict as assert } from "node:assert";
import test from "node:test";
import {
  buildTabsAppleScript,
  detectFlavorFromScriptingDefinition,
  extractBundleIdFromInfoPlist,
  getBrowserScriptFlavor,
  getScriptingBundleId,
  isKnownBrowserBundleId,
  isSafeBundleId,
  isStaleCrossTabSelection,
  parseBrowserWindowTabs,
  TAB_FIELD_SEPARATOR,
} from "./browser-tabs";

const sep = TAB_FIELD_SEPARATOR;

test("getBrowserScriptFlavor maps bundle ids case-insensitively", () => {
  assert.equal(getBrowserScriptFlavor("com.apple.Safari"), "safari");
  assert.equal(getBrowserScriptFlavor("com.google.Chrome"), "chromium");
  assert.equal(getBrowserScriptFlavor("org.mozilla.firefox"), "none");
  assert.equal(getBrowserScriptFlavor("com.anthropic.claudefordesktop"), undefined);
  assert.equal(getBrowserScriptFlavor(undefined), undefined);
});

test("getBrowserScriptFlavor covers the Chromium browsers people actually use", () => {
  // Bundle ids verified against installed apps; all use the `active tab` dialect.
  for (const bundleId of [
    "company.thebrowser.Browser", // Arc
    "company.thebrowser.dia", // Dia
    "com.openai.atlas", // ChatGPT Atlas
    "ai.perplexity.comet", // Comet
    "com.brave.Browser",
    "com.microsoft.edgemac",
    "com.operasoftware.Opera",
    "com.operasoftware.OperaGX",
    "com.vivaldi.Vivaldi",
    "org.chromium.Chromium",
  ]) {
    assert.equal(getBrowserScriptFlavor(bundleId), "chromium", `${bundleId} should be chromium`);
  }
});

test("isKnownBrowserBundleId recognizes non-scriptable browsers too", () => {
  assert.equal(isKnownBrowserBundleId("com.apple.Safari"), true);
  assert.equal(isKnownBrowserBundleId("org.mozilla.firefox"), true);
  assert.equal(isKnownBrowserBundleId("app.zen-browser.zen"), true);
  assert.equal(isKnownBrowserBundleId("com.apple.finder"), false);
});

test("isSafeBundleId rejects anything that could break out of the script string", () => {
  assert.equal(isSafeBundleId("com.apple.safari"), true);
  assert.equal(isSafeBundleId("company.thebrowser.Browser"), true);
  assert.equal(isSafeBundleId('com.apple.safari" & (do shell script "id") & "'), false);
  assert.equal(isSafeBundleId("com.evil app"), false);
  assert.equal(isSafeBundleId(""), false);
});

test("detectFlavorFromScriptingDefinition infers the dialect for unlisted browsers", () => {
  const chromiumSdef = '<property name="active tab" type="tab"/><property name="URL" type="text"/>';
  const safariSdef = '<property name="current tab" type="tab"/><property name="URL" type="text"/>';

  assert.equal(detectFlavorFromScriptingDefinition(chromiumSdef), "chromium");
  assert.equal(detectFlavorFromScriptingDefinition(safariSdef), "safari");
});

test("getScriptingBundleId redirects launcher bundles to the scriptable one", () => {
  // ChatGPT Atlas: macOS reports com.openai.atlas, but the AppleScript terminology lives
  // in the nested com.openai.atlas.web bundle, so `active tab` fails against the wrapper.
  assert.equal(getScriptingBundleId("com.openai.atlas"), "com.openai.atlas.web");
  assert.equal(getScriptingBundleId("com.openai.Atlas"), "com.openai.atlas.web");
  // Browsers without a nested bundle are addressed directly.
  assert.equal(getScriptingBundleId("com.apple.Safari"), "com.apple.Safari");
  assert.equal(getScriptingBundleId("company.thebrowser.dia"), "company.thebrowser.dia");
});

test("extractBundleIdFromInfoPlist reads XML plists and ignores unparseable ones", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>ChatGPT Atlas</string>
  <key>CFBundleIdentifier</key><string>com.openai.atlas.web</string>
</dict></plist>`;

  assert.equal(extractBundleIdFromInfoPlist(xml), "com.openai.atlas.web");
  assert.equal(extractBundleIdFromInfoPlist("bplist00\u0000binary garbage"), undefined);
  assert.equal(extractBundleIdFromInfoPlist(""), undefined);
});

test("detectFlavorFromScriptingDefinition ignores tabbed apps that aren't browsers", () => {
  // Terminals and editors expose "current tab" but never a URL on it; probing them would
  // raise pointless Automation prompts.
  const terminalSdef = '<property name="current tab" type="tab"/><property name="title" type="text"/>';

  assert.equal(detectFlavorFromScriptingDefinition(terminalSdef), undefined);
  assert.equal(detectFlavorFromScriptingDefinition(""), undefined);
});

test("buildTabsAppleScript uses the right dialect per browser", () => {
  const safariScript = buildTabsAppleScript("com.apple.safari", "safari");
  assert.match(safariScript, /URL of current tab/);
  assert.match(safariScript, /name of current tab/);
  assert.match(safariScript, /tell application id "com\.apple\.safari"/);

  const chromiumScript = buildTabsAppleScript("com.google.chrome", "chromium");
  assert.match(chromiumScript, /URL of active tab/);
  assert.match(chromiumScript, /title of active tab/);
});

test("buildTabsAppleScript never requests page contents", () => {
  const script = buildTabsAppleScript("com.apple.safari", "safari");
  assert.equal(/do JavaScript|source of|text of document/.test(script), false);
});

test("buildTabsAppleScript isolates background-tab enumeration from the front tab read", () => {
  // Browsers vary in whether `tabs of window` is scriptable; failing to enumerate them
  // must not discard the active tab's URL, which is the value we actually need.
  const script = buildTabsAppleScript("company.thebrowser.dia", "chromium");
  const repeatIndex = script.indexOf("repeat with aTab");
  const guardIndex = script.lastIndexOf("try", repeatIndex);

  assert.ok(guardIndex > -1 && guardIndex < repeatIndex, "the repeat loop must sit inside a try block");
  assert.ok(script.indexOf("URL of active tab") < guardIndex, "the front tab is read before the guarded loop");
});

test("buildTabsAppleScript never dereferences the window into a variable", () => {
  // Regression: `set theWindow to front window` then `active tab of theWindow` fails on
  // Arc and Dia with "can't convert class …". The tell block keeps the live reference.
  for (const flavor of ["safari", "chromium"] as const) {
    const script = buildTabsAppleScript("com.example.browser", flavor);

    assert.match(script, /tell front window/, `${flavor} must address the window with a tell block`);
    assert.equal(/set \w+ to front window/.test(script), false, `${flavor} must not store the window in a variable`);
  }
});

test("parseBrowserWindowTabs reads the front tab and background values", () => {
  const output = [
    "https://example.com/front",
    "Front Page",
    "https://example.com/front",
    "Front Page",
    "https://example.com/other",
    "Other Page",
  ].join(sep);

  assert.deepEqual(parseBrowserWindowTabs(output), {
    frontUrl: "https://example.com/front",
    frontTitle: "Front Page",
    backgroundValues: ["https://example.com/other", "Other Page"],
  });
});

test("parseBrowserWindowTabs handles empty and malformed output", () => {
  assert.equal(parseBrowserWindowTabs(""), undefined);
  assert.equal(parseBrowserWindowTabs("https://example.com"), undefined);
  assert.equal(parseBrowserWindowTabs(`${sep}`), undefined);
});

test("isStaleCrossTabSelection flags a selection belonging to another tab", () => {
  const windowTabs = parseBrowserWindowTabs(
    [
      "https://example.com/front",
      "Front Page",
      "https://example.com/other",
      "Prompt Engineering: How to Talk to the AIs",
    ].join(sep),
  );

  // The exact regression seen in Safari: a leftover selection from a background tab.
  assert.equal(isStaleCrossTabSelection("Prompt Engineering: How to Talk to the AIs", windowTabs), true);
  assert.equal(isStaleCrossTabSelection("https://example.com/other", windowTabs), true);
});

test("isStaleCrossTabSelection keeps genuine selections from the front tab", () => {
  const windowTabs = parseBrowserWindowTabs(
    ["https://example.com/front", "Front Page", "https://example.com/other", "Other Page"].join(sep),
  );

  assert.equal(isStaleCrossTabSelection("Front Page", windowTabs), false);
  assert.equal(isStaleCrossTabSelection("https://example.com/front", windowTabs), false);
  // Arbitrary prose selected on the front page must never be discarded.
  assert.equal(isStaleCrossTabSelection("a paragraph the user highlighted", windowTabs), false);
});

test("isStaleCrossTabSelection is inert without tab context", () => {
  assert.equal(isStaleCrossTabSelection("anything", undefined), false);
  assert.equal(isStaleCrossTabSelection("", parseBrowserWindowTabs(`https://a.test${sep}A`)), false);
});
