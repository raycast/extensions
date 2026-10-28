import { BrowserExtension, environment, getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";

const log = logger.child("[BrowserLink]");

export interface BrowserTab {
  url: string;
  /**
   * Only the Browser Extension can supply this. Every AppleScript fallback below
   * reads the address bar and returns a URL alone, so callers must treat a missing
   * title as normal rather than as a failure.
   */
  title?: string;
}

/**
 * Whether a page TITLE can be read at all.
 *
 * Only the Browser Extension supplies titles — the AppleScript fallbacks below
 * read the address bar and return a URL alone — and that API is unavailable
 * both when the extension isn't installed and on Windows, where Raycast does
 * not expose it yet. Callers should hide title-dependent UI when this is false
 * rather than offering an action that can only fail. Synchronous, so it is safe
 * to call during render.
 */
export function canReadPageTitle(): boolean {
  return environment.canAccess(BrowserExtension);
}

/**
 * Get the active browser tab.
 *
 * Tries the Browser Extension API first (the only source of a page title), then
 * falls back to AppleScript per browser.
 */
export async function getBrowserTab(): Promise<BrowserTab | null> {
  if (environment.canAccess(BrowserExtension)) {
    try {
      const tabs = await BrowserExtension.getTabs();
      const tab = tabs.find((t) => t.active) ?? tabs[0];

      if (tab?.url) {
        // `title` is undefined while a tab is still loading, and a whitespace-only
        // title is no more useful than none — normalise both to undefined.
        return { url: tab.url, title: tab.title?.trim() || undefined };
      }
    } catch (error) {
      // Fallback to AppleScript if Browser Extension API fails
      log.warn("Browser Extension API failed, falling back to AppleScript", error);
    }
  }

  const url = await getUrlViaAppleScript();
  return url ? { url } : null;
}

/**
 * Get the current URL from the active browser tab.
 *
 * @returns {Promise<string | null>} The URL of the active browser tab, or null if unavailable
 */
export async function getBrowserLink(): Promise<string | null> {
  return (await getBrowserTab())?.url ?? null;
}

async function getUrlViaAppleScript(): Promise<string | null> {
  try {
    const app = await getFrontmostApplication();

    switch (app.bundleId) {
      case "company.thebrowser.Browser":
        return runAppleScript(`tell application "Arc" to return URL of active tab of front window`);
      case "com.vivaldi.Vivaldi":
        return runAppleScript(`tell application "Vivaldi" to return URL of active tab of front window`);
      case "com.google.Chrome":
        return runAppleScript(`tell application "Google Chrome" to return URL of active tab of front window`);
      case "com.brave.Browser":
        return runAppleScript(`tell application "Brave Browser" to return URL of active tab of front window`);
      case "com.apple.Safari":
        return runAppleScript(`tell application "Safari" to return URL of front document`);
      case "com.kagi.kagimacOS":
        return runAppleScript(`tell application "Orion" to return URL of front document`);
      case "org.mozilla.firefox":
        return runAppleScript(`
          tell application "System Events"
            set firefox to application process "Firefox"

            -- HACK: It is important to get the list of UI elements; otherwise, we get an error
            get properties of firefox

            set frontWindow to front window of firefox
            set firstGroup to first group of frontWindow
            set navigation to toolbar "Navigation" of firstGroup
            get value of UI element 1 of combo box 1 of navigation
          end tell
        `);
      case "app.zen-browser.zen":
        return runAppleScript(`
          tell application "System Events"
              set zen to application process "Zen"

              get properties of zen

              set frontWindow to front window of zen
              set firstGroup to first group of frontWindow
              set navigation to toolbar "Navigation" of group 1 of group 1 of firstGroup
              get value of UI element 1 of combo box 1 of group 1 of navigation
          end tell
        `);
      default:
        break;
    }

    // Fallback for Vivaldi Browser not recognized by bundleId
    if (app?.name === "Vivaldi.app") {
      return runAppleScript(`tell application "Vivaldi" to return URL of active tab of front window`);
    }

    log.warn(`Unsupported browser: ${app.name}`);
    return null;
  } catch (error) {
    log.error("Failed to get browser link", error);
    return null;
  }
}
