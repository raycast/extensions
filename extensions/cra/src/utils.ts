import { Keyboard } from "@raycast/api";
import { searchArcPreferences } from "./preferences";
import { HistoryEntry, Space, Download, Tab, TabLocation } from "./types";

export function getDomain(url: string) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export function getLastVisitedAt(entry: HistoryEntry) {
  const date = new Date(entry.lastVisitedAt);
  return { date, tooltip: `Last visited: ${date.toLocaleString()}` };
}

export function getDownloadedAt(entry: Download) {
  const date = new Date(entry.download_time);
  return { date, tooltip: `Downloaded time: ${date.toLocaleString()}` };
}

export function getSpaceTitle(space: Space) {
  return space.title || `Space ${space.id}`;
}

export function findSpaceInSpaces(spaceId: string, spaces: Space[]): string | undefined {
  const space = spaces.find(
    (s) => getSpaceTitle(s).toLowerCase() === spaceId.toLowerCase() || s.id.toString() === spaceId,
  );
  return space && getSpaceTitle(space);
}

export function getKey(tab: Tab) {
  return `${tab.id}`;
}

export function getOrderedLocations(): TabLocation[] {
  return [
    { location: "topApp" as TabLocation, order: Number(searchArcPreferences.favoritesTabsOrder) },
    { location: "pinned" as TabLocation, order: Number(searchArcPreferences.pinnedTabsOrder) },
    { location: "unpinned" as TabLocation, order: Number(searchArcPreferences.unpinnedTabsOrder) },
  ]
    .sort((a, b) => a.order - b.order)
    .map((l) => l.location);
}

export function isLocationShown(location: TabLocation) {
  switch (location) {
    case "topApp":
      return searchArcPreferences.showFavorites;
    case "pinned":
      return searchArcPreferences.showPinnedTabs;
    case "unpinned":
      return searchArcPreferences.showUnpinnedTabs;
  }
}

export function getLocationTitle(location: TabLocation) {
  switch (location) {
    case "topApp":
      return "Favorites";
    case "pinned":
      return "Pinned Tabs";
    case "unpinned":
      return "Unpinned Tabs";
  }
}

export function getShortcut(modifiers: Keyboard.KeyModifier[], index: number) {
  const key = index + 1;

  let shortcut: Keyboard.Shortcut | undefined;
  if (key >= 1 && key <= 9) {
    shortcut = { modifiers: modifiers, key: String(key) as Keyboard.KeyEquivalent };
  }

  return shortcut;
}

export function getNumberOfTabs(tabs?: Tab[]) {
  if (!tabs) {
    return undefined;
  }

  return tabs.length === 1 ? "1 tab" : `${tabs.length} tabs`;
}

export function getNumberOfHistoryEntries(entries?: HistoryEntry[]) {
  if (!entries) {
    return undefined;
  }

  return entries.length === 1 ? "1 entry" : `${entries.length} entries`;
}

const ALLOWED_PROTOCOLS = ["http:", "https:", "cra:"];

/**
 * Returns an absolute URL that is safe to open in Cra: `https://` is added when the scheme is missing, and only
 * http(s) and cra:// URLs are accepted. Throws an Error with a user-readable message otherwise.
 */
export function normalizeURL(url: string | undefined): string {
  const value = url?.trim();
  if (!value) {
    throw new Error("No URL found");
  }

  const withScheme = /^\S+?:\/\//.test(value) ? value : `https://${value}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error(`Invalid URL provided: ${value}`);
  }
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new Error(`Unsupported URL scheme "${parsed.protocol}". Only http, https and cra URLs can be opened.`);
  }

  return withScheme;
}

export function isURL(value: string): boolean {
  const urlPattern = /^(?:(?:https?|ftp):\/\/)?(?:[\w-]+\.)+\w{2,}|localhost[:?\d]*(?:\/|$)/;
  return urlPattern.test(value);
}
