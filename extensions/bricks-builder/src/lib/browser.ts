import { runAppleScript } from "@raycast/utils";

const CHROMIUM_BROWSERS = [
  "Google Chrome",
  "Google Chrome Canary",
  "Arc",
  "Brave Browser",
  "Microsoft Edge",
  "Vivaldi",
  "Chromium",
  "Opera",
  "Dia",
];
const SAFARI_BROWSERS = ["Safari", "Safari Technology Preview", "Orion"];
export const SUPPORTED_BROWSERS = [...CHROMIUM_BROWSERS, ...SAFARI_BROWSERS];

export class UnsupportedBrowserError extends Error {}

function tabReference(browser: string): string {
  if (CHROMIUM_BROWSERS.includes(browser)) return "active tab of front window";
  if (SAFARI_BROWSERS.includes(browser)) return "current tab of front window";
  throw new UnsupportedBrowserError(`${browser} isn't supported. Use Chrome, Arc, Brave, Edge or Safari.`);
}

const escape = (value: string) => value.replace(/["\\]/g, "\\$&");

export async function getFrontmostApp(): Promise<string> {
  return runAppleScript(
    'tell application "System Events" to return name of first application process whose frontmost is true',
  );
}

export async function getActiveTabUrl(browser: string): Promise<string> {
  return runAppleScript(`tell application "${escape(browser)}" to return URL of ${tabReference(browser)}`);
}

export async function setActiveTabUrl(browser: string, url: string): Promise<void> {
  await runAppleScript(
    `tell application "${escape(browser)}" to set URL of ${tabReference(browser)} to "${escape(url)}"`,
  );
}

/**
 * The URL of the active tab in the first running supported browser, for prefilling forms while
 * Raycast itself is in front.
 */
export async function getAnyBrowserTabUrl(): Promise<string | undefined> {
  const running = (
    await runAppleScript('tell application "System Events" to return name of every application process')
  ).split(", ");
  for (const browser of SUPPORTED_BROWSERS) {
    if (!running.includes(browser)) continue;
    try {
      const url = await getActiveTabUrl(browser);
      if (/^https?:/i.test(url)) return url;
    } catch {
      // No window open in this browser; try the next one.
    }
  }
  return undefined;
}
