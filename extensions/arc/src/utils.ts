import { HistoryEntry, Space, Tab, TabLocation } from "./types";

export function getDomain(url: string) {
  try {
    const urlObj = new URL(url);
    return {
      value: urlObj.hostname.replace("www.", ""),
      tooltip: url,
    };
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export function getLastVisitedAt(entry: HistoryEntry) {
  const date = new Date(entry.lastVisitedAt);
  return { date, tooltip: `Last visited: ${date.toLocaleString()}` };
}

export function getSpaceTitle(space: Space) {
  return space.title || `Space ${space.id}`;
}

export function getKey(tab: Tab) {
  return `${tab.windowId}-${tab.tabId}`;
}

export function getOrderedLocations() {
  return ["topApp", "pinned", "unpinned"] as TabLocation[];
}

export function getLocationTitle(location: TabLocation) {
  switch (location) {
    case "topApp":
      return "Top";
    case "pinned":
      return "Pinned";
    case "unpinned":
      return "Unpinned";
  }
}

export function getNumberOfTabs(tabs?: Tab[]) {
  if (!tabs) {
    return undefined;
  }

  return tabs.length === 1 ? "1 tab" : `${tabs.length} tabs`;
}
