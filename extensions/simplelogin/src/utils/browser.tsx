/**
 * CREDIT: The AppleScript snippets were taken from the whois extension
 */
import { runAppleScript } from "@raycast/utils";

const CHROMIUM_BROWSERS_REGEX = /Chrome|Opera|Brave|Edge|Vivaldi/i;
const WEBKIT_BROWSERS_REGEX = /Safari|Orion/i;

/**
 * Retrieves the hostname from the active browser tab.
 *
 * @returns {Promise<string | undefined>} The hostname of the active tab, or undefined if:
 *   - Platform is not macOS (AppleScript not available)
 *   - Browser is not supported
 *   - Unable to extract URL from browser
 *
 * @remarks
 * Currently only supports macOS platform using AppleScript.
 * Other platforms (Windows, Linux) return undefined as browser URL extraction
 * is unreliable across different browsers and configurations.
 */
export default async (): Promise<string | undefined> => {
  if (process.platform === "darwin") {
    // macOS: Use AppleScript for reliable browser integration
    const browser = await getFrontmostAppMacOS();
    let url: string | undefined;

    if (browser.match(WEBKIT_BROWSERS_REGEX)) {
      url = await getWebKitURL(browser);
    } else if (browser.match(CHROMIUM_BROWSERS_REGEX)) {
      url = await getChromiumURLMacOS(browser);
    } else if (browser.match(/Arc/i)) {
      url = await getArcURL();
    }

    if (!url) {
      return;
    }

    try {
      return new URL(url).hostname;
    } catch (error) {
      console.error("Failed to get hostname", error);
      return;
    }
  } else {
    // Windows, Linux, and other platforms: Browser URL extraction is unreliable
    // across different browsers and configurations. Return undefined so callers
    // fall back gracefully without attempting extraction.
    return;
  }
};

const getFrontmostAppMacOS = () => {
  return runAppleScript(`
    tell application "System Events"
      set frontmostApp to name of first application process whose frontmost is true
      return frontmostApp
    end tell
  `);
};

const getWebKitURL = (browser: string) => {
  return runAppleScript(`
    tell application "${browser}" to get URL of front document
  `);
};

const getChromiumURLMacOS = (browser = "Google Chrome") => {
  return runAppleScript(`
    tell application "${browser}"
      set currentTab to active tab of front window
      set currentURL to URL of currentTab
      return currentURL
    end tell
  `);
};

const getArcURL = () => {
  return runAppleScript(`
    tell application "Arc"
      tell front window
        get the URL of active tab
      end tell
    end tell
  `);
};
