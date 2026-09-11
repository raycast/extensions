import { strict as assert } from "node:assert";
import test from "node:test";
import {
  buildActiveTabAppleScript,
  detectFlavorFromScriptingDefinition,
  extractBundleIdFromInfoPlist,
  getBrowserScriptFlavor,
  getScriptingBundleId,
  isKnownBrowserBundleId,
  isSafeBundleId,
  parseActiveTabUrl,
} from "./browser-tabs";

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

test("buildActiveTabAppleScript uses the right dialect per browser", () => {
  const safariScript = buildActiveTabAppleScript("com.apple.safari", "safari");
  assert.match(safariScript, /URL of current tab/);
  assert.match(safariScript, /tell application id "com\.apple\.safari"/);

  const chromiumScript = buildActiveTabAppleScript("com.google.chrome", "chromium");
  assert.match(chromiumScript, /URL of active tab/);
});

test("buildActiveTabAppleScript only ever asks for the active tab's URL", () => {
  // The Automation permission this needs is justified by how little it reads: no page
  // contents, no titles, and no list of the user's other tabs.
  for (const flavor of ["safari", "chromium"] as const) {
    const script = buildActiveTabAppleScript("com.example.browser", flavor);

    assert.equal(/do JavaScript|source of|text of document/.test(script), false, "must not read page contents");
    assert.equal(/repeat|tabs of|every tab/.test(script), false, "must not enumerate other tabs");
    assert.equal(/name of|title of/.test(script), false, "must not read titles");
  }
});

test("buildActiveTabAppleScript never dereferences the window into a variable", () => {
  // Regression: `set theWindow to front window` then `active tab of theWindow` fails on
  // Arc and Dia with "can't convert class …". The tell block keeps the live reference.
  for (const flavor of ["safari", "chromium"] as const) {
    const script = buildActiveTabAppleScript("com.example.browser", flavor);

    assert.match(script, /tell front window/, `${flavor} must address the window with a tell block`);
    assert.equal(/set \w+ to front window/.test(script), false, `${flavor} must not store the window in a variable`);
  }
});

test("parseActiveTabUrl trims the script output and rejects empties", () => {
  assert.equal(parseActiveTabUrl("https://example.com/front\n"), "https://example.com/front");
  assert.equal(parseActiveTabUrl("   "), undefined);
  assert.equal(parseActiveTabUrl(""), undefined);
});
