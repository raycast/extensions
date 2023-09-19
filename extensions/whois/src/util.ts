import { runAppleScript } from "@raycast/utils";

const getFrontmostApp = () => {
  return runAppleScript(`
      tell application "System Events"
        set frontmostApp to name of first application process whose frontmost is true
        return frontmostApp
      end tell
      `);
};

const getSafariURL = () => {
  return runAppleScript(`
    tell application "Safari" to get URL of front document
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

const chromiumBrowsers = ["Google Chrome", "Opera", "Brave Browser", "Microsoft Edge", "Vivaldi"];

export const getURL = async () => {
  const browser = await getFrontmostApp();

  if (browser.match(/Safari/i)) {
    return getSafariURL();
  } else if (chromiumBrowsers.some((b) => browser.startsWith(b))) {
    return getChromiumURL(browser);
  } else if (browser.match(/Arc/i)) {
    return getArcURL();
  }

  throw new Error(`Application ${browser} not supported`);
};
