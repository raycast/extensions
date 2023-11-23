import { Clipboard, environment, Keyboard, showHUD, showToast, Toast } from "@raycast/api";
import { searchArcPreferences } from "./preferences";
import { HistoryEntry, Space, Tab, TabLocation } from "./types";

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

export function getSpaceTitle(space: Space) {
  return space.title || `Space ${space.id}`;
}

export function getKey(tab: Tab) {
  return `${tab.windowId}-${tab.tabId}`;
}

export function getOrderedLocations() {
  return ["topApp", "pinned", "unpinned"] as TabLocation[];
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

export function isTab(tab: any): tab is Tab {
  if (tab && tab.windowId && tab.tabId && tab.url && tab.title && tab.location) {
    return true;
  }

  return false;
}

export function getNumberOfHistoryEntries(entries?: HistoryEntry[]) {
  if (!entries) {
    return undefined;
  }

  return entries.length === 1 ? "1 entry" : `${entries.length} entries`;
}

export async function showFailureToast(error: unknown, options?: Omit<Toast.Options, "style">) {
  if (!error) {
    return;
  }

  if (environment.launchType === "background") {
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: options?.title ?? "Something went wrong",
    message: options?.message ?? (error instanceof Error ? error.message : String(error)),
    primaryAction: {
      title: "Copy Error",
      async onAction(toast) {
        const content = error instanceof Error ? error?.stack || error?.message || String(error) : String(error);
        await Clipboard.copy(content);
        await toast.hide();
      },
    },
  });
}

export async function validateURL(url: string) {
  const urlRegex =
    /(http(s)?:\/\/|arc:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{0,256}(\.[a-z]{2,6})?\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

  if (url === undefined || url === "") {
    await showHUD("❌ No URL found");
    return false;
  }

  if (!urlRegex.test(url)) {
    await showHUD("❌ Invalid URL provided");
    return false;
  }

  return true;
}
