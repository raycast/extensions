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

const UNIT_SEPARATOR = "\u001F";
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

export async function tabFromBrowserExtension(): Promise<TabInfo | undefined> {
  if (!environment.canAccess(BrowserExtension)) return undefined;
  try {
    const tabs = await BrowserExtension.getTabs();
    const tab = tabs.find((candidate) => candidate.active) ?? tabs[0];
    if (!tab?.url) return undefined;
    return { url: tab.url, title: tab.title ?? "", source: "Browser Extension" };
  } catch {
    return undefined;
  }
}

export async function allTabsFromBrowserExtension(): Promise<TabInfo[]> {
  if (!environment.canAccess(BrowserExtension)) return [];
  try {
    const tabs = await BrowserExtension.getTabs();
    return tabs
      .filter((tab) => Boolean(tab.url))
      .map((tab) => ({ url: tab.url, title: tab.title ?? "", source: "Browser Extension" }));
  } catch {
    return [];
  }
}

async function frontmostBrowserName(): Promise<string | undefined> {
  if (!isMac()) return undefined;
  try {
    let app = await getFrontmostApplication();
    // Raycast can still be the frontmost app right after launching a command.
    if (app.name === "Raycast") {
      await new Promise((resolve) => setTimeout(resolve, 200));
      app = await getFrontmostApplication();
    }
    return isKnownBrowser(app.name) ? app.name : undefined;
  } catch {
    return undefined;
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
  return "Could not read the current tab. Bring a supported browser to the front and try again.";
}

export async function getActiveTab(options: LookupOptions): Promise<TabInfo> {
  const useAppleScript = options.browserSource !== "extension" && isMac();
  const useExtension = options.browserSource !== "applescript";

  if (useAppleScript && options.preferredBrowser && isKnownBrowser(options.preferredBrowser)) {
    const tab = await tabFromAppleScript(options.preferredBrowser);
    if (tab) return tab;
  }

  if (useAppleScript && !options.preferredBrowser) {
    const frontmost = await frontmostBrowserName();
    if (frontmost) {
      const tab = await tabFromAppleScript(frontmost);
      if (tab) return tab;
    }
  }

  if (useExtension) {
    const tab = await tabFromBrowserExtension();
    if (tab) return tab;
  }

  // Last resort: ask every supported browser that happens to be running.
  if (useAppleScript && !options.preferredBrowser) {
    for (const appName of Object.keys(APPLESCRIPT_BROWSERS)) {
      const tab = await tabFromAppleScript(appName);
      if (tab) return tab;
    }
  }

  throw new NoTabError(noTabMessage(options));
}

export async function getAllTabs(options: LookupOptions): Promise<TabInfo[]> {
  const useAppleScript = options.browserSource !== "extension" && isMac();
  const useExtension = options.browserSource !== "applescript";

  if (useAppleScript) {
    const appName =
      options.preferredBrowser && isKnownBrowser(options.preferredBrowser)
        ? options.preferredBrowser
        : await frontmostBrowserName();
    if (appName) {
      const tabs = await allTabsFromAppleScript(appName);
      if (tabs.length > 0) return tabs;
    }
  }

  if (useExtension) {
    const tabs = await allTabsFromBrowserExtension();
    if (tabs.length > 0) return tabs;
  }

  throw new NoTabError(noTabMessage(options));
}
