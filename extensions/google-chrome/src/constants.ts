import { getDefaultProfileID } from "./util";

export const defaultChromeProfilePath = ["Application Support", "Google", "Chrome"];
export const defaultChromeStatePath = ["Application Support", "Google", "Chrome", "Local State"];
export const DEFAULT_CHROME_PROFILE_ID = getDefaultProfileID();
export const CHROME_PROFILE_KEY = "CHROME_PROFILE_KEY";
export const CHROME_PROFILES_KEY = "CHROME_PROFILES_KEY";

export const DownloadText = `
  # 🚨Error: Google Chrome browser is not installed
  ## This extension depends on Google Chrome browser. You must install it to continue.
  
  If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install Google Chrome browser.
  
  [Click here](https://www.google.com/chrome/) if you want to download manually.
  
  [![Google Chrome](https://www.google.com/chrome/static/images/chrome-logo-m100.svg)]()
`;

export const NoBookmarksText = `
# 🚨Error: Google Chrome browser has no bookmarks. Please add some bookmarks to continue using this command.

[![Google Chrome](https://www.google.com/chrome/static/images/chrome-logo-m100.svg)]()
`;

export const UnknownErrorText = `
# 🚨Error: Something happened while trying to run your command
  
[![Google Chrome](https://www.google.com/chrome/static/images/chrome-logo-m100.svg)]()
`;

export const DEFAULT_ERROR_TITLE = "An Error Occurred";

export const NOT_INSTALLED_MESSAGE = "Google Chrome not installed";
export const NO_BOOKMARKS_MESSAGE = "Google Chrome has no bookmarks.";
