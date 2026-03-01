import { Color, Icon, List } from "@raycast/api";
import { type HistoryItem, type Tab } from "./dia";
import { getFavicon } from "@raycast/utils";

/**
 * Escapes a string for safe use in AppleScript string literals.
 * Escapes backslashes and quotes.
 */
export function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Escapes special characters in SQL LIKE patterns to prevent SQL injection.
 * Escapes: %, _, \, and quotes
 * Note: Backslashes are doubled for SQL string literals, then special chars are escaped
 */
export function escapeSQLLikePattern(pattern: string): string {
  return pattern.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/"/g, '""');
}

export function getSafeFavicon(url: string): List.Item.Props["icon"] {
  const invalidSchemes = ["javascript:", "data:", "about:", "chrome:", "file:"];
  const urlLower = url.toLowerCase().trim();

  if (invalidSchemes.some((scheme) => urlLower.startsWith(scheme))) {
    return { source: Icon.Link, tintColor: Color.SecondaryText };
  }

  return getFavicon(url);
}

export function getSubtitle(url: string) {
  try {
    const { hostname } = new URL(url);
    // Remove leading 'www.' from hostname if present
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getAccessories(tab: Tab) {
  const accessories: List.Item.Accessory[] = [];
  if (tab.isFocused) {
    accessories.push({ icon: { source: Icon.Dot, tintColor: Color.Blue }, tooltip: "Focused tab" });
  }
  return accessories;
}

export function filterTabs(tabs: Tab[] | undefined, query: string) {
  if (!query || !tabs) return tabs;

  return tabs.filter(
    (tab) =>
      tab.title.toLowerCase().includes(query.toLowerCase()) || tab.url?.toLowerCase().includes(query.toLowerCase()),
  );
}

export function filterHistory(
  history: HistoryItem[] | undefined,
  openTabs: Tab[] | undefined,
): HistoryItem[] | undefined {
  if (!history) return history;
  if (!openTabs || openTabs.length === 0) return history;

  // Create a Set of open tab URLs for O(1) lookup performance
  const openTabUrls = new Set(openTabs.map((tab) => tab.url?.toLowerCase()).filter(Boolean));

  // Filter out history items that match open tabs
  return history.filter((item) => !openTabUrls.has(item.url.toLowerCase()));
}
