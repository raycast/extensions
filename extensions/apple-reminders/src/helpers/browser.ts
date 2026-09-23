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

export function getTabAppleScript(browserName: string): string {
  if (WEBKIT_BROWSERS.includes(browserName as (typeof WEBKIT_BROWSERS)[number])) {
    return `tell application "${browserName}"
      if (count of windows) > 0 then
        set currentTab to current tab of front window
        return (name of currentTab) & "|||" & (URL of currentTab)
      end if
    end tell`;
  }

  return `tell application "${browserName}"
    if (count of windows) > 0 then
      set currentTab to active tab of front window
      return (title of currentTab) & "|||" & (URL of currentTab)
    end if
  end tell`;
}

export async function getRunningSupportedBrowsers(): Promise<string[]> {
  try {
    const script = `tell application "System Events" to get name of every application process`;
    const res = await runAppleScript(script);
    if (!res) return [];
    const running = res.split(", ").map((name) => name.trim());
    return (ALL_SUPPORTED_BROWSERS as readonly string[]).filter((browser) => running.includes(browser));
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
    // Continue to running browsers check
  }

  // 2. Check running supported browsers
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
  if (!rawResult || !rawResult.includes("|||")) {
    return undefined;
  }

  const [rawTitle, rawUrl] = rawResult.split("|||");
  const title = (rawTitle ?? "").trim();
  const url = (rawUrl ?? "").trim();

  if (!title && !url) {
    return undefined;
  }

  return {
    title: title || url,
    url,
    browser: browserName,
  };
}
