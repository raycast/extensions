const messaging = {
  RESULTS_PLACEHOLDER: "Type something to get started",
  RESULTS_EMPTY: "No results found",
  RESULTS_LOADING: "Searching...",
  RESULTS_TITLE: "Results",
  SEARCH_PLACEHOLDER: "Search for a slackmoji...",
  TOAST_DOWNLOAD_ERROR: "Failed to download",
  TOAST_DOWNLOAD_SUCCESS: "Downloaded",
  TOAST_DOWNLOAD_LOADING: "Downloading",
  TOAST_SEARCH_ERROR_TITLE: "Failed to search",
  TOAST_SEARCH_ERROR_MESSAGE: "An error occurred",
  ACTION_COPY: "Copy URL to Clipboard",
  ACTION_DOWNLOAD: "Download",
  ACTION_OPEN_IN_BROWSER: "Open in Browser",
} as const satisfies Record<string, string>;

export { messaging };
