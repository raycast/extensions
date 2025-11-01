export const APP_NAME = "Quick Jump";

export const DEFAULT_ICON = "icon.png";
export const DEFAULT_TITLE = "Untitled";
export const FALLBACK_ICON = "icon.png";
export const COMMON_TLDS = new Set(["com", "net", "org", "io", "co", "edu", "gov", "mil", "biz", "info"]);

export const SECTION_TITLES = {
  GROUPS: "Groups",
  ALL_URLS: "All URLs",
  LINKED_URLS: "Linked URLs",
  OTHER_URLS: "Other URLs",
  TEMPLATE_URLS: "Generated From Templates",
} as const;

export const ACTION_TITLES = {
  BROWSE_GROUP: "Browse Group",
  OPEN_CONFIG_FILE: "Open Config File",
  COPY_URL: "Copy URL",
} as const;

export const ERROR_MESSAGES = {
  FILE_NOT_FOUND: "Configuration file not found. Please check your extension preferences.",
  INVALID_CONFIG: "Invalid configuration file. Missing required sections.",
  EMPTY_FILE: "Configuration file is empty.",
  UNKNOWN_ERROR: "An unknown error occurred while loading the configuration file.",
} as const;
