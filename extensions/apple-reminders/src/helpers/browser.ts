import { getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export type BrowserTab = {
  title: string;
  url: string;
  browser: string;
};

export const WEBKIT_BROWSERS = ["Safari", "Orion", "Safari Technology Preview"] as const;

export const CHROMIUM_BROWSERS = [
  "Google Chrome",
  "Arc",
  "Brave Browser",
  "Microsoft Edge",
  "Vivaldi",
  "Opera",
  "Opera GX",
  "Chromium",
  "Sidekick",
  "SigmaOS",
  "Dia",
  "Yandex",
] as const;

export const ALL_SUPPORTED_BROWSERS = [...WEBKIT_BROWSERS, ...CHROMIUM_BROWSERS] as const;

export const TAB_DELIMITER = "---RAYCAST_TAB_SEPARATOR---";

export function getTabAppleScript(browserName: string): string {
  if (WEBKIT_BROWSERS.includes(browserName as (typeof WEBKIT_BROWSERS)[number])) {
    return `tell application "${browserName}"
      if (count of windows) > 0 then
        tell front window
          return (get name of current tab) & "${TAB_DELIMITER}" & (get URL of current tab)
        end tell
      end if
    end tell`;
  }

  return `tell application "${browserName}"
    if (count of windows) > 0 then
      tell front window
        return (get title of active tab) & "${TAB_DELIMITER}" & (get URL of active tab)
      end tell
    end if
  end tell`;
}

export async function getRunningSupportedBrowsers(): Promise<string[]> {
  try {
    const script = `tell application "System Events" to get name of every application process whose background only is false`;
    const res = await runAppleScript(script);
    if (!res) return [];
    const ordered = res.split(", ").map((name) => name.trim());
    return ordered.filter((browser) => (ALL_SUPPORTED_BROWSERS as readonly string[]).includes(browser));
  } catch {
    return [];
  }
}

export async function getActiveBrowserTab(): Promise<BrowserTab | undefined> {
  // 1. Check if the frontmost app is a supported browser
  try {
    const frontApp = await getFrontmostApplication();
    if (frontApp && (ALL_SUPPORTED_BROWSERS as readonly string[]).includes(frontApp.name)) {
      const script = getTabAppleScript(frontApp.name);
      const res = await runAppleScript(script);
      const tab = parseTabResult(res, frontApp.name);
      if (tab) return tab;
    }
  } catch {
    // Continue to ordered running browsers check
  }

  // 2. Query running supported browsers in macOS MRU / z-order
  const runningBrowsers = await getRunningSupportedBrowsers();
  for (const browserName of runningBrowsers) {
    try {
      const script = getTabAppleScript(browserName);
      const res = await runAppleScript(script);
      const tab = parseTabResult(res, browserName);
      if (tab) return tab;
    } catch {
      // Continue to next running browser
    }
  }

  return undefined;
}

export function parseTabResult(rawResult: string | undefined, browserName: string): BrowserTab | undefined {
  if (!rawResult || !rawResult.includes(TAB_DELIMITER)) {
    return undefined;
  }

  const lastIdx = rawResult.lastIndexOf(TAB_DELIMITER);
  const title = rawResult.slice(0, lastIdx).trim();
  const url = rawResult.slice(lastIdx + TAB_DELIMITER.length).trim();

  if (!title && !url) {
    return undefined;
  }

  return {
    title: title || url,
    url,
    browser: browserName,
  };
}
