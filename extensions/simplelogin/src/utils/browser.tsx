/**
 * CREDIT: The AppleScript snippets were taken from the whois extension
 */
import { runAppleScript } from "@raycast/utils";

const CHROMIUM_BROWSERS_REGEX = /Chrome|Opera|Brave|Edge|Vivaldi/i;
const WEBKIT_BROWSERS_REGEX = /Safari|Orion/i;

export default async (): Promise<string | undefined> => {
  const browser = await getFrontmostApp();
  let url: string | undefined;

  if (browser.match(WEBKIT_BROWSERS_REGEX)) {
    url = await getWebKitURL(browser);
  } else if (browser.match(CHROMIUM_BROWSERS_REGEX)) {
    url = await getChromiumURL(browser);
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
};

const getFrontmostApp = () => {
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

const getChromiumURL = (browser = "Google Chrome") => {
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
