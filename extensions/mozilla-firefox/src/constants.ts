export const SEARCH_ENGINE: { [key: string]: string } = {
  google: `https://google.com/search?q=`,
  bing: `https://www.bing.com/search?q=`,
  baidu: `https://www.baidu.com/s?wd=`,
  brave: `https://search.brave.com/search?q=`,
  duckduckgo: `https://duckduckgo.com/?q=`,
};

export const DownloadText = `
  # 🚨Error: Mozilla Firefox browser is not installed
  ## This extension depends on Mozilla Firefox browser. You must install it to continue.
  
  If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install Mozilla Firefox browser.
  [Click here](https://www.mozilla.org/en-US/firefox/new/) if you want to download manually.
  
  [![Mozilla Firefox](https://mozilla.design/files/2019/10/logo-firefox.svg)]()
`;

export const NoBookmarksText = `
# 🚨Error: Mozilla Firefox browser has no bookmarks. Please add some bookmarks to continue using this command.

[![Mozilla Firefox](https://mozilla.design/files/2019/10/logo-firefox.svg)]()
`;

export const UnknownErrorText = `
# 🚨Error: Something happened while trying to run your command
  
[![Mozilla Firefox](https://mozilla.design/files/2019/10/logo-firefox.svg)]()
`;

export const DEFAULT_ERROR_TITLE = "An Error Occurred";

export const NOT_INSTALLED_MESSAGE = "Mozilla Firefox not installed";
export const NO_BOOKMARKS_MESSAGE = "Mozilla Firefox has no bookmarks";
