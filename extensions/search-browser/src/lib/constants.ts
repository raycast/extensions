import os from "os";
import path from "path";

export const SEARCH_APP_NAME = "Search";
export const SEARCH_BUNDLE_ID = "com.officecommun.search";
export const SEARCH_DOWNLOAD_URL = "https://searchbrowser.app/";

export const SEARCH_DATA_DIR = path.join(os.homedir(), "Library", "Application Support", "Search");

export const PRIVACY_AUTOMATION_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation";
export const PRIVACY_ACCESSIBILITY_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

/**
 * Seconds between Unix epoch (1970-01-01) and Apple Core Data / CFAbsoluteTime epoch (2001-01-01).
 */
export const APPLE_EPOCH_OFFSET_SECONDS = 978307200;

export type SearchEngineId =
  "browser" | "google" | "duckduckgo" | "kagi" | "brave" | "startpage" | "qwant" | "bing" | "ecosia" | "perplexity";

export const SEARCH_ENGINES: Record<Exclude<SearchEngineId, "browser">, { name: string; urlTemplate: string }> = {
  google: {
    name: "Google",
    urlTemplate: "https://www.google.com/search?q=%s",
  },
  duckduckgo: {
    name: "DuckDuckGo",
    urlTemplate: "https://duckduckgo.com/?q=%s",
  },
  kagi: {
    name: "Kagi",
    urlTemplate: "https://kagi.com/search?q=%s",
  },
  brave: {
    name: "Brave Search",
    urlTemplate: "https://search.brave.com/search?q=%s",
  },
  startpage: {
    name: "Startpage",
    urlTemplate: "https://www.startpage.com/sp/search?query=%s",
  },
  qwant: {
    name: "Qwant",
    urlTemplate: "https://www.qwant.com/?q=%s",
  },
  bing: {
    name: "Bing",
    urlTemplate: "https://www.bing.com/search?q=%s",
  },
  ecosia: {
    name: "Ecosia",
    urlTemplate: "https://www.ecosia.org/search?q=%s",
  },
  perplexity: {
    name: "Perplexity",
    urlTemplate: "https://www.perplexity.ai/search?q=%s",
  },
};
