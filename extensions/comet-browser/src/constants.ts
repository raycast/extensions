export const defaultCometProfilePath = ["Application Support", "Comet"];
export const defaultCometStatePath = [
  "Application Support",
  "Comet",
  "Local State",
];
export const DEFAULT_COMET_PROFILE_ID = "Default";
export const COMET_PROFILE_KEY = "COMET_PROFILE_KEY";
export const COMET_PROFILES_KEY = "COMET_PROFILES_KEY";

export const DownloadText = `
  # 🚨Error: Comet browser is not installed
  ## This extension depends on Comet browser. You must install it to continue.
  
  If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install Comet browser.
  
  [Click here](https://www.perplexity.ai/comet) if you want to download manually.
  
  [![Comet](https://www.perplexity.ai/comet/static/images/comet-logo.svg)]()
`;

export const NoBookmarksText = `
# 🚨Error: Comet browser has no bookmarks. Please add some bookmarks to continue using this command.

[![Comet](https://www.perplexity.ai/comet/static/images/comet-logo.svg)]()
`;

export const UnknownErrorText = `
# 🚨Error: Something happened while trying to run your command
  
[![Comet](https://www.perplexity.ai/comet/static/images/comet-logo.svg)]()
`;

export const DEFAULT_ERROR_TITLE = "An Error Occurred";

export const NOT_INSTALLED_MESSAGE = "Comet not installed";
export const NO_BOOKMARKS_MESSAGE = "Comet has no bookmarks.";
