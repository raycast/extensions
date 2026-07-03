import type { Tab } from "../types";

export const sharedPendingCloseIds = new Set<string>();

export function filterPendingCloseTabs(tabs: Tab[], pendingIds: ReadonlySet<string>): Tab[] {
  if (pendingIds.size === 0) return tabs;
  return tabs.filter((tab) => !pendingIds.has(tab.id));
}

export function releaseConfirmedPendingCloseIds(pendingIds: Set<string>, tabs: Tab[]): string[] {
  const visibleIds = new Set(tabs.map((tab) => tab.id));
  const released: string[] = [];

  for (const id of pendingIds) {
    if (!visibleIds.has(id)) {
      pendingIds.delete(id);
      released.push(id);
    }
  }

  return released;
}

export function idsStillPresent(ids: Iterable<string>, tabs: Tab[]): string[] {
  const visibleIds = new Set(tabs.map((tab) => tab.id));
  return [...ids].filter((id) => visibleIds.has(id));
}
