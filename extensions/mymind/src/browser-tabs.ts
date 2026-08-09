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

/** Unlikely to appear inside a real URL or page title, so it's safe as a field separator. */
export const TAB_FIELD_SEPARATOR = "|__RC__|";

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

export function buildTabsAppleScript(bundleId: string, flavor: ScriptableBrowserFlavor): string {
  const activeTab = flavor === "safari" ? "current tab" : "active tab";
  const titleProperty = flavor === "safari" ? "name" : "title";

  // Everything stays inside `tell front window`: assigning the window to a variable
  // dereferences it in some browsers (Arc and Dia raise "can't convert class …" on the
  // following `active tab of theWindow`), whereas a tell block keeps the live reference.
  //
  // The background-tab loop has its own `try` so a browser that exposes an active tab but
  // can't enumerate `tabs` still yields the front tab's URL.
  return `
set sep to "${TAB_FIELD_SEPARATOR}"
tell application id "${bundleId}"
  if (count of windows) is 0 then return ""
  tell front window
    set out to ((URL of ${activeTab}) as text) & sep & ((${titleProperty} of ${activeTab}) as text)
    try
      repeat with aTab in tabs
        try
          set out to out & sep & ((URL of aTab) as text) & sep & ((${titleProperty} of aTab) as text)
        end try
      end repeat
    end try
  end tell
  return out
end tell`;
}

export type BrowserWindowTabs = {
  frontUrl?: string;
  frontTitle?: string;
  /** URLs and titles of the front window's other tabs. */
  backgroundValues: string[];
};

export function parseBrowserWindowTabs(output: string): BrowserWindowTabs | undefined {
  const fields = output.split(TAB_FIELD_SEPARATOR).map((field) => field.trim());

  if (fields.length < 2) {
    return undefined;
  }

  const [frontUrl, frontTitle, ...rest] = fields;

  if (!frontUrl && !frontTitle) {
    return undefined;
  }

  return {
    frontUrl: frontUrl || undefined,
    frontTitle: frontTitle || undefined,
    backgroundValues: rest.filter((value) => value && value !== frontUrl && value !== frontTitle),
  };
}

/**
 * Safari's Accessibility API can hand back a selection left behind in a *different* tab.
 * Treat a "selection" that exactly matches another tab's URL or title — and not the front
 * tab's — as stale, so callers can prefer the front tab's URL instead.
 */
export function isStaleCrossTabSelection(selectedValue: string, windowTabs?: BrowserWindowTabs): boolean {
  if (!windowTabs?.frontUrl || !selectedValue) {
    return false;
  }

  return (
    selectedValue !== windowTabs.frontUrl &&
    selectedValue !== windowTabs.frontTitle &&
    windowTabs.backgroundValues.includes(selectedValue)
  );
}
