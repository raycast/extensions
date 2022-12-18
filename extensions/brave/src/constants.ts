export const defaultBraveProfilePath = ["Application Support", "BraveSoftware", "Brave-Browser", "Default"];

export const DownloadBraveText = `
  # 🚨Error: Brave browser is not installed
  ## This extension depends on Brave browser. You must install it to continue.
  
  If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install Brave browser.
  [Click here](https://brave.com/download/) if you want to download manually.
  
  [![Brave](https://brave.com/static-assets/images/brave-logo.svg)]()
`;

export const NoBraveBookmarksText = `# 🚨Error 
Brave browser has no bookmarks. Please add some bookmarks to continue using this command.`;

export const DEFAULT_ERROR_TITLE = "An Error Occurred";

export const BRAVE_NOT_INSTALLED_MESSAGE = "Brave not installed";
export const BRAVE_NO_BOOKMARKS_MESSAGE = /^ENOENT.*Bookmarks'$/;
