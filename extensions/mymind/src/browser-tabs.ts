/**
 * Reading the frontmost browser's active tab.
 *
 * Apple Events only ever expose tab URLs and titles here — never page contents — so this
 * needs the one-time "control <Browser>" Automation permission rather than a browser
 * extension's much broader per-site "read and alter web pages" access.
 */

/**
 * AppleScript dialect per browser: Safari uses `current tab`/`name`, Chromium-based
 * browsers (Chrome, Edge, Brave, Arc, Dia, Atlas, Comet, …) use `active tab`/`title`.
 * `"none"` marks a browser we recognize but can't script (Firefox and its forks), so
 * callers can fall back to the Raycast Browser Extension.
 */
export type BrowserScriptFlavor = "safari" | "chromium" | "none";

export type ScriptableBrowserFlavor = Exclude<BrowserScriptFlavor, "none">;

/**
 * Fast path for browsers we've verified. Unknown browsers still work through
 * {@link detectFlavorFromScriptingDefinition}, so this list is an optimization
 * rather than the limit of what's supported.
 */
const BROWSER_BUNDLE_FLAVORS = new Map<string, BrowserScriptFlavor>([
  // WebKit
  ["com.apple.safari", "safari"],
  ["com.apple.safaritechnologypreview", "safari"],
  // Chromium
  ["com.google.chrome", "chromium"],
  ["com.google.chrome.beta", "chromium"],
  ["com.google.chrome.dev", "chromium"],
  ["com.google.chrome.canary", "chromium"],
  ["org.chromium.chromium", "chromium"],
  ["com.microsoft.edgemac", "chromium"],
  ["com.microsoft.edgemac.beta", "chromium"],
  ["com.microsoft.edgemac.dev", "chromium"],
  ["com.microsoft.edgemac.canary", "chromium"],
  ["com.brave.browser", "chromium"],
  ["com.brave.browser.beta", "chromium"],
  ["com.brave.browser.nightly", "chromium"],
  ["com.operasoftware.opera", "chromium"],
  ["com.operasoftware.operanext", "chromium"],
  ["com.operasoftware.operagx", "chromium"],
  ["com.vivaldi.vivaldi", "chromium"],
  ["company.thebrowser.browser", "chromium"], // Arc
  ["company.thebrowser.dia", "chromium"], // Dia
  ["com.openai.atlas", "chromium"], // ChatGPT Atlas
  ["ai.perplexity.comet", "chromium"], // Comet
  // Gecko — no usable AppleScript tab dictionary
  ["org.mozilla.firefox", "none"],
  ["org.mozilla.firefoxdeveloperedition", "none"],
  ["org.mozilla.nightly", "none"],
  ["app.zen-browser.zen", "none"],
]);

/**
 * Some browsers ship the scriptable app nested inside a launcher bundle, so the id
 * reported for the frontmost app isn't the one that owns the AppleScript terminology.
 * ChatGPT Atlas is the known case: `com.openai.atlas` wraps `com.openai.atlas.web`.
 */
const SCRIPTING_BUNDLE_OVERRIDES = new Map<string, string>([["com.openai.atlas", "com.openai.atlas.web"]]);

export function getScriptingBundleId(bundleId: string): string {
  return SCRIPTING_BUNDLE_OVERRIDES.get(bundleId.toLowerCase()) ?? bundleId;
}

/** Pulls `CFBundleIdentifier` out of an XML `Info.plist`. Binary plists return undefined. */
export function extractBundleIdFromInfoPlist(infoPlist: string): string | undefined {
  const match = /<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/.exec(infoPlist);
  return match?.[1]?.trim() || undefined;
}

/**
 * Bundle ids are interpolated into AppleScript source, so anything that isn't a plain
 * reverse-DNS identifier is rejected rather than escaped.
 */
const BUNDLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isSafeBundleId(bundleId: string): boolean {
  return BUNDLE_ID_PATTERN.test(bundleId);
}

export function getBrowserScriptFlavor(bundleId?: string): BrowserScriptFlavor | undefined {
  return bundleId ? BROWSER_BUNDLE_FLAVORS.get(bundleId.toLowerCase()) : undefined;
}

export function isKnownBrowserBundleId(bundleId?: string): boolean {
  return getBrowserScriptFlavor(bundleId) !== undefined;
}

/** AppleScript is macOS-only; on other platforms callers must skip this path entirely. */
export function supportsAppleScript(): boolean {
  return process.platform === "darwin";
}

/**
 * Infers the dialect from an app's scripting definition, so browsers that aren't in the
 * allowlist (new entrants, forks, nightlies) keep working without a code change.
 *
 * Requires a `URL` property alongside the tab terminology: plenty of non-browsers expose
 * "current tab" (terminals, editors) but only browsers put a URL on it. Without that
 * guard we'd trigger pointless Automation permission prompts for unrelated apps.
 */
export function detectFlavorFromScriptingDefinition(scriptingDefinition: string): ScriptableBrowserFlavor | undefined {
  if (!/name="URL"/.test(scriptingDefinition)) {
    return undefined;
  }

  if (/name="active tab"/.test(scriptingDefinition)) {
    return "chromium";
  }

  if (/name="current tab"/.test(scriptingDefinition)) {
    return "safari";
  }

  return undefined;
}

export function buildActiveTabAppleScript(bundleId: string, flavor: ScriptableBrowserFlavor): string {
  const activeTab = flavor === "safari" ? "current tab" : "active tab";

  // Everything stays inside `tell front window`: assigning the window to a variable
  // dereferences it in some browsers (Arc and Dia raise "can't convert class …" on the
  // following `active tab of theWindow`), whereas a tell block keeps the live reference.
  return `
tell application id "${bundleId}"
  if (count of windows) is 0 then return ""
  tell front window
    return (URL of ${activeTab}) as text
  end tell
end tell`;
}

export function parseActiveTabUrl(output: string): string | undefined {
  const url = output.trim();
  return url || undefined;
}
