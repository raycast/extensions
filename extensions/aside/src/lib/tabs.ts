import { BrowserExtension, environment } from "@raycast/api";
import { closeAsideTabsById, getAsideTabSnapshot } from "./applescript";
import { filterSearchable } from "./search";
import { getPinnedTabIds } from "./session";
import type { LiveTab, Tab } from "./types";

const FAVICON_TIMEOUT_MS = 250;

async function getBrowserExtensionTabs() {
  if (!environment.canAccess(BrowserExtension)) return [];
  return Promise.race([
    BrowserExtension.getTabs().catch(() => []),
    new Promise<[]>((resolve) => setTimeout(() => resolve([]), FAVICON_TIMEOUT_MS)),
  ]);
}

/**
 * AppleScript is the source of truth for tab identity. It sees every tab,
 * including ones Raycast's Browser Extension can't (file://, chrome://, empty
 * new-tab pages). The Browser Extension is consulted in parallel only to
 * harvest favicons (which AS doesn't expose); they're attached by URL match.
 *
 * `Tab.id` is the stable Aside AppleScript id, used as React key, optimistic-
 * state key, and the handle passed back into AS for switch/close.
 */
export async function getTabs(): Promise<Tab[]> {
  const [{ tabs }, beTabs] = await Promise.all([getLiveTabSnapshot(), getBrowserExtensionTabs()]);

  const faviconByUrl = new Map<string, string>();
  for (const t of beTabs) {
    if (t.favicon && !faviconByUrl.has(t.url)) faviconByUrl.set(t.url, t.favicon);
  }

  return tabs.map((t) => ({
    id: t.id,
    url: t.url,
    title: t.title || "",
    favicon: faviconByUrl.get(t.url),
    isPinned: t.isPinned,
  }));
}

export interface LiveTabSnapshot {
  browserStatus: "running" | "not_running";
  tabs: LiveTab[];
}

/** Read Aside's current tab metadata without focusing the browser. */
export async function getLiveTabSnapshot(): Promise<LiveTabSnapshot> {
  const [snapshot, pinnedTabIds] = await Promise.all([getAsideTabSnapshot(), getPinnedTabIds()]);
  return {
    browserStatus: snapshot.browserStatus,
    tabs: snapshot.tabs.map((tab) => ({
      ...tab,
      isPinned: pinnedTabIds.has(tab.id),
    })),
  };
}

export function filterLiveTabs(tabs: LiveTab[], query = ""): LiveTab[] {
  return filterSearchable(tabs, query);
}

export function planDuplicateTabs<T extends { url: string }>(tabs: T[]): T[] {
  const seenUrls = new Set<string>();
  return tabs.filter((tab) => {
    if (seenUrls.has(tab.url)) return true;
    seenUrls.add(tab.url);
    return false;
  });
}

export interface TabDeduplicationResult {
  browserStatus: "running" | "not_running";
  duplicateCount: number;
  closedCount: number;
  failedIds: string[];
}

/** Re-read current tabs, preserve the first exact URL match, and close the rest. */
export async function deduplicateTabs(options?: {
  onPlanned?: (duplicates: { id: string }[]) => Promise<void> | void;
}): Promise<TabDeduplicationResult> {
  const snapshot = await getAsideTabSnapshot();
  const duplicates = planDuplicateTabs(snapshot.tabs);
  await options?.onPlanned?.(duplicates);

  const failedIds = await closeAsideTabsById(duplicates.map((tab) => tab.id));
  return {
    browserStatus: snapshot.browserStatus,
    duplicateCount: duplicates.length,
    closedCount: duplicates.length - failedIds.length,
    failedIds,
  };
}
