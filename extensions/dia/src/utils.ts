import { type HistoryItem, type Tab } from "./dia";

export function getSubtitle(url: string) {
  try {
    const { hostname } = new URL(url);
    // Remove leading 'www.' from hostname if present
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
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
