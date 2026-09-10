import { BrowserExtension, environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export interface TabInfo {
  url: string;
  title: string;
  source: string;
}

type ScriptFlavour = "chromium" | "webkit";

/**
 * Browsers that expose the active tab through AppleScript.
 * Chromium based browsers all share the same dictionary, WebKit based ones
 * (Safari, Orion, Safari Technology Preview) use `front document` instead.
 */
export const APPLESCRIPT_BROWSERS: Record<string, ScriptFlavour> = {
  Arc: "chromium",
  Dia: "chromium",
  "Google Chrome": "chromium",
  "Google Chrome Beta": "chromium",
  "Google Chrome Dev": "chromium",
  "Google Chrome Canary": "chromium",
  Chromium: "chromium",
  "Brave Browser": "chromium",
  "Brave Browser Beta": "chromium",
  "Brave Browser Nightly": "chromium",
  "Microsoft Edge": "chromium",
  "Microsoft Edge Beta": "chromium",
  "Microsoft Edge Dev": "chromium",
  "Microsoft Edge Canary": "chromium",
  Vivaldi: "chromium",
  Opera: "chromium",
  "Opera GX": "chromium",
  "Opera Air": "chromium",
  "Opera Beta": "chromium",
  "Yandex Browser": "chromium",
  "Naver Whale": "chromium",
  Sidekick: "chromium",
  Comet: "chromium",
  Helium: "chromium",
  Shift: "chromium",
  Wavebox: "chromium",
  Safari: "webkit",
  "Safari Technology Preview": "webkit",
  Orion: "webkit",
  "Orion RC": "webkit",
};

/** ASCII unit separator: splits the URL from the title inside one result. */
const UNIT_SEPARATOR = "\u001F";
/** ASCII record separator: splits one tab from the next. */
const RECORD_SEPARATOR = "\u001E";

function isMac(): boolean {
  return process.platform === "darwin";
}

function activeTabScript(app: string, flavour: ScriptFlavour): string {
  const fields =
    flavour === "chromium"
      ? `(URL of active tab of front window) & fs & (title of active tab of front window)`
      : `(URL of front document) & fs & (name of front document)`;
  return `set fs to (ASCII character 31)
if application "${app}" is not running then return ""
tell application "${app}"
  if (count of windows) is 0 then return ""
  return ${fields}
end tell`;
}

function allTabsScript(app: string, flavour: ScriptFlavour): string {
  const body =
    flavour === "chromium"
      ? `repeat with t in (tabs of front window)
    set out to out & (URL of t) & fs & (title of t) & rs
  end repeat`
      : `repeat with t in (tabs of front window)
    set out to out & (URL of t) & fs & (name of t) & rs
  end repeat`;
  return `set fs to (ASCII character 31)
set rs to (ASCII character 30)
set out to ""
if application "${app}" is not running then return ""
tell application "${app}"
  if (count of windows) is 0 then return ""
  ${body}
end tell
return out`;
}

function parseTab(raw: string, source: string): TabInfo | undefined {
  const [url, ...rest] = raw.split(UNIT_SEPARATOR);
  if (!url || !url.trim()) return undefined;
  return { url: url.trim(), title: rest.join(UNIT_SEPARATOR).trim(), source };
}

export function isKnownBrowser(appName: string): boolean {
  return Object.prototype.hasOwnProperty.call(APPLESCRIPT_BROWSERS, appName);
}

export async function tabFromAppleScript(appName: string): Promise<TabInfo | undefined> {
  const flavour = APPLESCRIPT_BROWSERS[appName];
  if (!isMac() || !flavour) return undefined;
  try {
    const raw = await runAppleScript(activeTabScript(appName, flavour), { timeout: 10_000 });
    return parseTab(raw, appName);
  } catch {
    return undefined;
  }
}

export async function allTabsFromAppleScript(appName: string): Promise<TabInfo[]> {
  const flavour = APPLESCRIPT_BROWSERS[appName];
  if (!isMac() || !flavour) return [];
  try {
    const raw = await runAppleScript(allTabsScript(appName, flavour), { timeout: 15_000 });
    return raw
      .split(RECORD_SEPARATOR)
      .map((line) => parseTab(line.replace(/^[\r\n]+/, ""), appName))
      .filter((tab): tab is TabInfo => tab !== undefined);
  } catch {
    return [];
  }
}

/**
 * The tabs the browser extension reports as active. There is one per browser
 * window, and the API does not say which window has the focus, so anything
 * beyond a single result is ambiguous and must not be guessed.
 */
export async function activeTabsFromBrowserExtension(): Promise<TabInfo[]> {
  if (!environment.canAccess(BrowserExtension)) return [];
  try {
    const tabs = await BrowserExtension.getTabs();
    return tabs
      .filter((tab) => tab.active && Boolean(tab.url))
      .map((tab) => ({ url: tab.url, title: tab.title ?? "", source: "Browser Extension" }));
  } catch {
    return [];
  }
}

/**
 * Visible applications, front to back. Used to find the browser the user
 * looked at most recently, which is not always the frontmost app: pasting a
 * link into Teams means the browser sits one layer behind it.
 */
async function browsersByLayer(): Promise<string[]> {
  if (!isMac()) return [];
  try {
    const raw = await runAppleScript(
      'tell application "System Events" to return name of every application process whose background only is false',
      { timeout: 10_000 },
    );
    return raw
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name && name !== "Raycast" && isKnownBrowser(name));
  } catch {
    return [];
  }
}

export interface LookupOptions {
  /** "auto" | "applescript" | "extension" */
  browserSource: string;
  /** Application name coming from an appPicker preference. */
  preferredBrowser?: string;
}

export class NoTabError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoTabError";
  }
}

/** Several browser windows claim an active tab and none of them can be ruled out. */
export class AmbiguousTabError extends Error {
  readonly candidates: TabInfo[];

  constructor(candidates: TabInfo[]) {
    super(
      `${candidates.length} browser windows report an active tab, and the browser extension does not say which one has the focus. Pick the site yourself, or set a preferred browser in the extension preferences.`,
    );
    this.name = "AmbiguousTabError";
    this.candidates = candidates;
  }
}

function noTabMessage(options: LookupOptions): string {
  if (!isMac()) {
    return "Could not read the current tab. On Windows this needs the Raycast browser extension.";
  }
  if (options.preferredBrowser) {
    return `Could not read a tab from ${options.preferredBrowser}. Is it running with an open window?`;
  }
  if (options.browserSource === "extension") {
    return "Could not read the current tab. Is the Raycast browser extension installed and running?";
  }
  return "Could not read the current tab. Open a supported browser, or set a preferred browser in the extension preferences.";
}

export async function getActiveTab(options: LookupOptions): Promise<TabInfo> {
  const useAppleScript = options.browserSource !== "extension" && isMac();
  const useExtension = options.browserSource !== "applescript";

  if (useAppleScript) {
    if (options.preferredBrowser && isKnownBrowser(options.preferredBrowser)) {
      const tab = await tabFromAppleScript(options.preferredBrowser);
      if (tab) return tab;
    } else {
      // Front to back, so the browser closest to the front wins.
      for (const appName of await browsersByLayer()) {
        const tab = await tabFromAppleScript(appName);
        if (tab) return tab;
      }
    }
  }

  if (useExtension) {
    const candidates = await activeTabsFromBrowserExtension();
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) throw new AmbiguousTabError(candidates);
  }

  throw new NoTabError(noTabMessage(options));
}

/** Like {@link getActiveTab}, but hands ambiguity to the caller instead of throwing. */
export async function getTabCandidates(options: LookupOptions): Promise<TabInfo[]> {
  try {
    return [await getActiveTab(options)];
  } catch (error) {
    if (error instanceof AmbiguousTabError) return error.candidates;
    return [];
  }
}

/**
 * Every tab of one browser window.
 *
 * Deliberately AppleScript only: `BrowserExtension.getTabs()` returns the tabs
 * of every window at once and carries no window identity, so using it here
 * would quietly mix in tabs the user cannot see.
 */
export async function getAllTabs(options: LookupOptions): Promise<TabInfo[]> {
  if (!isMac() || options.browserSource === "extension") {
    throw new NoTabError(
      "Copying a whole window needs AppleScript, because the browser extension does not say which window a tab belongs to. Use a browser that supports AppleScript, or copy tabs one at a time.",
    );
  }

  const names =
    options.preferredBrowser && isKnownBrowser(options.preferredBrowser)
      ? [options.preferredBrowser]
      : await browsersByLayer();

  for (const appName of names) {
    const tabs = await allTabsFromAppleScript(appName);
    if (tabs.length > 0) return tabs;
  }

  throw new NoTabError(noTabMessage(options));
}
