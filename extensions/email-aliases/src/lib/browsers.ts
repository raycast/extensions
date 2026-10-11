import { BrowserExtension, environment, getFrontmostApplication } from "@raycast/api";
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

/**
 * Browsers without AppleScript support. Their tabs can only be read through the
 * Raycast browser extension, so when one of them is in front, the tab of some
 * other browser running in the background must not be taken instead.
 */
const EXTENSION_ONLY_BROWSERS = new Set([
  "Firefox",
  "Firefox Developer Edition",
  "Firefox Nightly",
  "Zen",
  "Zen Browser",
  "LibreWolf",
  "Waterfox",
  "Floorp",
  "Tor Browser",
  "Mullvad Browser",
]);

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

function windowActiveUrlsScript(app: string, flavour: ScriptFlavour): string {
  const field = flavour === "chromium" ? "URL of active tab of w" : "URL of current tab of w";
  return `set rs to (ASCII character 30)
set out to ""
if application "${app}" is not running then return ""
tell application "${app}"
  repeat with w in windows
    try
      set out to out & (${field}) & rs
    end try
  end repeat
end tell
return out`;
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

function isExtensionOnlyBrowser(appName: string): boolean {
  return EXTENSION_ONLY_BROWSERS.has(appName);
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

/** How often each URL is the active tab of a window of a running AppleScript browser. */
async function activeUrlsOfAppleScriptBrowsers(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const appName of await runningBrowsers()) {
    try {
      const raw = await runAppleScript(windowActiveUrlsScript(appName, APPLESCRIPT_BROWSERS[appName]), {
        timeout: 10_000,
      });
      raw
        .split(RECORD_SEPARATOR)
        .map((url) => url.trim())
        .filter(Boolean)
        .forEach((url) => counts.set(url, (counts.get(url) ?? 0) + 1));
    } catch {
      // A browser that does not answer adds nothing to compare against.
    }
  }
  return counts;
}

/**
 * Picks the tab from the browser extension's candidates, or throws.
 *
 * The extension API carries no browser or window identity, so candidates are
 * never filtered by guessing who they belong to: removing one could remove the
 * very tab the user is looking at. Several candidates with the same URL are the
 * same link and count once; different URLs are ambiguous.
 *
 * When the tab must come from a browser without AppleScript (Firefox, Zen …),
 * a single candidate is only taken if it cannot be an AppleScript browser's tab
 * in disguise: its URL is not open there, or the extension reports it more
 * often than the AppleScript browsers have it open.
 */
async function pickExtensionTab(candidates: TabInfo[], target?: string): Promise<TabInfo | undefined> {
  if (candidates.length === 0) return undefined;
  const urls = new Set(candidates.map((tab) => tab.url));
  if (urls.size > 1) throw new AmbiguousTabError(candidates, "windows");

  const tab = candidates[0];
  if (target && isMac()) {
    const openInAppleScript = (await activeUrlsOfAppleScriptBrowsers()).get(tab.url) ?? 0;
    if (openInAppleScript >= candidates.length) {
      throw new AmbiguousTabError(candidates, "unattributed", target);
    }
  }
  return tab;
}

/** Whether an app with this name is running, browser or not. */
async function isAppRunning(appName: string): Promise<boolean> {
  if (!isMac()) return true;
  try {
    const raw = await runAppleScript(
      'tell application "System Events" to return name of every application process whose background only is false',
      { timeout: 10_000 },
    );
    return raw.split(",").some((name) => name.trim() === appName);
  } catch {
    // Unknown: do not block the lookup on a failed check.
    return true;
  }
}

/**
 * Known browsers that are currently running, in no particular order.
 *
 * macOS does not expose a reliable "most recently used" ordering: the System
 * Events process list is not sorted by window layer, so it must not be read as
 * if it were. Order is therefore never used to break a tie.
 */
async function runningBrowsers(): Promise<string[]> {
  if (!isMac()) return [];
  try {
    const raw = await runAppleScript(
      'tell application "System Events" to return name of every application process whose background only is false',
      { timeout: 10_000 },
    );
    return raw
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name && isKnownBrowser(name));
  } catch {
    return [];
  }
}

/** The app in front, which is the one exact signal macOS does give us. */
async function frontmostApp(): Promise<string | undefined> {
  if (!isMac()) return undefined;
  try {
    let app = await getFrontmostApplication();
    if (app.name === "Raycast") {
      // Raycast can still own the menu bar right after a command starts.
      await new Promise((resolve) => setTimeout(resolve, 200));
      app = await getFrontmostApplication();
    }
    return app.name;
  } catch {
    return undefined;
  }
}

/**
 * Every browser that currently has a readable tab, the frontmost one first.
 *
 * The caller looks up the frontmost app once, before any AppleScript runs: by
 * the time the scripts are done, Raycast is often in front, so asking again
 * would lose the one reliable signal.
 */
async function tabsFromRunningBrowsers(front: string | undefined): Promise<TabInfo[]> {
  const names = await runningBrowsers();
  const ordered = front ? [front, ...names.filter((name) => name !== front)] : names;

  const tabs: TabInfo[] = [];
  for (const appName of ordered) {
    const tab = await tabFromAppleScript(appName);
    if (tab) tabs.push(tab);
  }
  return tabs;
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

/** More than one browser or window could be meant, and none can be ruled out. */
export class AmbiguousTabError extends Error {
  readonly candidates: TabInfo[];

  constructor(candidates: TabInfo[], reason: "windows" | "browsers" | "unattributed", target?: string) {
    const names = [...new Set(candidates.map((tab) => tab.source))].join(", ");
    super(
      reason === "browsers"
        ? `${names} are all open and none of them is in front, and macOS does not say which one you used last. Pick the site yourself, or set a preferred browser in the extension preferences.`
        : reason === "unattributed"
          ? `The browser extension reports one tab, but the same page is also open in another browser, and the extension does not say which browser a tab belongs to. Pick the site yourself, or check that the Raycast browser extension is running in ${target ?? "your browser"}.`
          : `${candidates.length} browser windows report an active tab, and the browser extension does not say which one has the focus. Pick the site yourself, or close the windows you don't need.`,
    );
    this.name = "AmbiguousTabError";
    this.candidates = candidates;
  }
}

function noTabMessage(options: LookupOptions): string {
  if (!isMac()) {
    return "Could not read the current tab. On Windows this needs the Raycast browser extension.";
  }
  if (options.preferredBrowser && !isKnownBrowser(options.preferredBrowser)) {
    return `${options.preferredBrowser} does not support AppleScript, so its tab is read through the Raycast browser extension. Is the extension installed and running in ${options.preferredBrowser}?`;
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
  const preferred = options.preferredBrowser;
  // A preferred browser without AppleScript support (Firefox, Zen …) can only be
  // read through the browser extension, so the other browsers must not be asked.
  const preferredNeedsExtension = Boolean(preferred) && !isKnownBrowser(preferred!);
  if (preferredNeedsExtension && options.browserSource === "applescript") {
    // Honour "AppleScript only" instead of quietly using the integration the user turned off.
    throw new NoTabError(
      `${preferred} does not support AppleScript, but the extension is set to read tabs through AppleScript only. Set the source preference to Automatic or Raycast browser extension, or pick a different preferred browser.`,
    );
  }
  const useAppleScript = options.browserSource !== "extension" && isMac() && !preferredNeedsExtension;
  const useExtension = options.browserSource !== "applescript";

  if (preferredNeedsExtension && !(await isAppRunning(preferred!))) {
    throw new NoTabError(`${preferred} is not running. Open it, or pick a different preferred browser.`);
  }

  // Looked up once, before any AppleScript runs (see tabsFromRunningBrowsers).
  const frontApp = !preferred && isMac() ? await frontmostApp() : undefined;
  // Firefox, Zen … in front: their tab is the one meant, and only the browser
  // extension can read it. A background browser's tab must not stand in for it.
  const frontNeedsExtension = frontApp !== undefined && isExtensionOnlyBrowser(frontApp);
  if (frontNeedsExtension && !useExtension) {
    throw new NoTabError(
      `${frontApp} does not support AppleScript, but the extension is set to read tabs through AppleScript only. Set the source preference to Automatic or Raycast browser extension.`,
    );
  }

  if (useAppleScript && !frontNeedsExtension) {
    if (preferred) {
      const tab = await tabFromAppleScript(preferred);
      if (tab) return tab;
    } else {
      const front = frontApp && isKnownBrowser(frontApp) ? frontApp : undefined;
      const tabs = await tabsFromRunningBrowsers(front);
      // One browser, or one in front: unambiguous. Several with none in front:
      // ask rather than pick an arbitrary one.
      if (tabs.length === 1) return tabs[0];
      if (tabs.length > 1) {
        const tab = front ? tabs.find((candidate) => candidate.source === front) : undefined;
        if (tab) return tab;
        throw new AmbiguousTabError(tabs, "browsers");
      }
    }
  }

  if (useExtension) {
    const target = preferredNeedsExtension ? preferred : frontNeedsExtension ? frontApp : undefined;
    const tab = await pickExtensionTab(await activeTabsFromBrowserExtension(), target);
    if (tab) return tab;
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
 * AppleScript only on purpose: `BrowserExtension.getTabs()` returns the tabs of
 * every window at once and carries no window identity, so using it here would
 * quietly mix in tabs the user cannot see.
 */
export async function getAllTabs(options: LookupOptions): Promise<TabInfo[]> {
  if (!isMac() || options.browserSource === "extension") {
    throw new NoTabError(
      "Copying a whole window needs AppleScript, because the browser extension does not say which window a tab belongs to. Use a browser that supports AppleScript, or copy tabs one at a time.",
    );
  }

  if (options.preferredBrowser && !isKnownBrowser(options.preferredBrowser)) {
    throw new NoTabError(
      `Copying a whole window needs AppleScript, which ${options.preferredBrowser} does not support. Pick a different preferred browser, or copy tabs one at a time.`,
    );
  }

  if (options.preferredBrowser) {
    const tabs = await allTabsFromAppleScript(options.preferredBrowser);
    if (tabs.length > 0) return tabs;
    throw new NoTabError(noTabMessage(options));
  }

  const frontApp = await frontmostApp();
  if (frontApp && isExtensionOnlyBrowser(frontApp)) {
    // Never copy the windows of a browser in the background instead.
    throw new NoTabError(
      `Copying a whole window needs AppleScript, which ${frontApp} does not support. Bring a browser that supports AppleScript to the front, or copy tabs one at a time.`,
    );
  }
  const front = frontApp && isKnownBrowser(frontApp) ? frontApp : undefined;
  if (front) {
    const tabs = await allTabsFromAppleScript(front);
    if (tabs.length > 0) return tabs;
  }

  const windows: TabInfo[][] = [];
  for (const appName of await runningBrowsers()) {
    const tabs = await allTabsFromAppleScript(appName);
    if (tabs.length > 0) windows.push(tabs);
  }

  if (windows.length === 1) return windows[0];
  if (windows.length > 1) {
    throw new AmbiguousTabError(
      windows.map((tabs) => tabs[0]),
      "browsers",
    );
  }

  throw new NoTabError(noTabMessage(options));
}
