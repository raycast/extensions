export const defaultChromeProfilePath = ["Application Support", "Google", "Chrome", "Default"];

export const DownloadChromeText = `
  # 🚨Error: Google Chrome browser is not installed
  ## This extension depends on Google Chrome browser. You must install it to continue.
  
  If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install Google Chrome browser.
  [Click here](https://www.google.com/chrome/) if you want to download manually.
  
  [![Google Chrome](https://www.google.com/chrome/static/images/chrome-logo-m100.svg)]()
`;

export const NoChromeBookmarksText = `# 🚨Error 
Google Chrome browser has no bookmarks. Please add some bookmarks to continue using this command.`;

export const DEFAULT_ERROR_TITLE = "An Error Occurred";

export const CHROME_NOT_INSTALLED_MESSAGE = "Google Chrome not installed";
export const CHROME_NO_BOOKMARKS_MESSAGE = /^ENOENT.*Bookmarks'$/;
