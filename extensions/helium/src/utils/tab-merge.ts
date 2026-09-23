import type { Tab } from "../types";
import type { HeliumTabRef } from "./applescript-parser";

interface FaviconTab {
  url: string;
  favicon?: string;
}

interface BrowserExtensionTab extends FaviconTab {
  id: number;
  title?: string;
}

/**
 * Build the internal tab model straight from Browser Extension tabs.
 *
 * Used on Windows, where there is no AppleScript source of truth: the Browser
 * Extension is the only tab provider, so its numeric tab id becomes `Tab.id`.
 * Unlike the macOS path, tabs the extension filters out (`file://` PDFs,
 * `chrome://` pages) are simply not visible.
 */
export function browserExtensionTabsToTabs(beTabs: BrowserExtensionTab[]): Tab[] {
  return beTabs.map((t) => ({
    id: String(t.id),
    url: t.url,
    title: t.title || "",
    favicon: t.favicon,
  }));
}

export function mergeAppleScriptTabsWithFavicons(asTabs: HeliumTabRef[], beTabs: FaviconTab[]): Tab[] {
  const faviconByUrl = new Map<string, string>();
  for (const t of beTabs) {
    if (t.favicon && !faviconByUrl.has(t.url)) faviconByUrl.set(t.url, t.favicon);
  }

  return asTabs.map((t) => ({
    id: t.heliumId,
    url: t.url,
    title: t.title || "",
    favicon: faviconByUrl.get(t.url),
  }));
}
