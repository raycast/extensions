import { AsideBookmark, AsideTab } from "../types";

export interface TabReference {
  tabId: string;
  windowId: string;
  title?: string;
}

export interface CloseTabsPlan {
  tabs: AsideTab[];
  stale: TabReference[];
}

export function parseTabReferences(json: string): TabReference[] {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("Close Tabs received invalid JSON.");
  }
  if (!Array.isArray(value) || value.length === 0) throw new Error("Close Tabs needs at least one tab.");

  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Tab ${index + 1} is not an object.`);
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.tabId !== "string" || typeof candidate.windowId !== "string") {
      throw new Error(`Tab ${index + 1} needs string tabId and windowId values.`);
    }
    return {
      tabId: candidate.tabId,
      windowId: candidate.windowId,
      title: typeof candidate.title === "string" ? candidate.title : undefined,
    };
  });
}

export function clampLimit(value: number | undefined, fallback = 50, maximum = 100): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(maximum, Math.trunc(value)));
}

export function resolveTabReferences(references: TabReference[], currentTabs: AsideTab[]): CloseTabsPlan {
  const uniqueReferences = [
    ...new Map(references.map((reference) => [`${reference.windowId}:${reference.tabId}`, reference])).values(),
  ];
  const currentTabsById = new Map(currentTabs.map((tab) => [`${tab.windowId}:${tab.id}`, tab]));
  const tabs: AsideTab[] = [];
  const stale: TabReference[] = [];

  for (const reference of uniqueReferences) {
    const currentTab = currentTabsById.get(`${reference.windowId}:${reference.tabId}`);
    if (currentTab) tabs.push(currentTab);
    else stale.push(reference);
  }

  return { tabs, stale };
}

export function closeTabsConfirmationMessage(tabs: AsideTab[], previewLimit = 5): string {
  const preview = tabs
    .slice(0, previewLimit)
    .map((tab) => {
      const title = (tab.title || "Untitled Tab").replace(/\s+/g, " ").trim();
      const url = tab.url.replace(/\s+/g, " ").trim() || "No URL";
      return `• ${title}\n  ${url}`;
    })
    .join("\n");
  const remainder = tabs.length > previewLimit ? `\n• …and ${tabs.length - previewLimit} more` : "";
  return `${preview}${remainder}`;
}

export function matchesSearch(value: string, query: string): boolean {
  const searchable = value.toLocaleLowerCase();
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((term) => searchable.includes(term));
}

export function filterTabs(tabs: AsideTab[], query?: string): AsideTab[] {
  if (!query?.trim()) return tabs;
  return tabs.filter((tab) => matchesSearch(`${tab.title} ${tab.url}`, query));
}

export function filterBookmarks(bookmarks: AsideBookmark[], query: string): AsideBookmark[] {
  return bookmarks.filter((bookmark) =>
    matchesSearch(`${bookmark.title} ${bookmark.url} ${bookmark.path.join(" ")}`, query),
  );
}

export function frontmostActiveTab(tabs: AsideTab[]): AsideTab | undefined {
  return tabs.filter((tab) => tab.active).sort((a, b) => a.windowIndex - b.windowIndex)[0];
}

export function toTabTarget(input: TabReference): Pick<AsideTab, "id" | "windowId"> {
  return { id: input.tabId, windowId: input.windowId };
}
