export const SEARCH_ENGINE: { [key: string]: string } = {
  google: `https://google.com/search?q=`,
  bing: `https://www.bing.com/search?q=`,
  baidu: `https://www.baidu.com/s?wd=`,
  brave: `https://search.brave.com/search?q=`,
  duckduckgo: `https://duckduckgo.com/?q=`,
  qwant: `https://www.qwant.com/?q=`,
};

export const DownloadText = `
    # 🚨Error: Librewolf Browser is not installed
    ## This extension depends on Librewolf browser. You must install it to continue.

    If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install "brew install --cask librewolf".
  `;
export const NoBookmarksText = `
  # 🚨Error: Librewolf Browser has no bookmarks. Please add some bookmarks to continue using this command.
  `;

export const UnknownErrorText = `
  # 🚨Error: Something happened while trying to run your command
  `;

export const DEFAULT_ERROR_TITLE = "An Error Occurred";

export const NOT_INSTALLED_MESSAGE = "Librewolf Browser not installed";
export const NO_BOOKMARKS_MESSAGE = "Librewolf Browser has no bookmarks";
