import { PhiBookmark, PhiError, PhiPinnedTab, PhiSpace, PhiTab } from "./types";

export interface TabSearchData {
  tabs: PhiTab[];
  pinnedTabs: PhiPinnedTab[];
  bookmarks: PhiBookmark[];
  targetSpaceId: string | null;
  spaces: PhiSpace[];
}

export function hasTabSearchResults(
  data: Pick<TabSearchData, "tabs" | "pinnedTabs" | "bookmarks">,
): boolean {
  return (
    data.tabs.length > 0 ||
    data.pinnedTabs.length > 0 ||
    data.bookmarks.length > 0
  );
}

export function groupTabsBySpace(
  tabs: PhiTab[],
  spaces: PhiSpace[],
): Array<{ space: PhiSpace | undefined; tabs: PhiTab[] }> {
  const spaceById = new Map(spaces.map((space) => [space.id, space]));
  const grouped = new Map<string, PhiTab[]>();
  for (const tab of tabs) {
    grouped.set(tab.spaceId, [...(grouped.get(tab.spaceId) ?? []), tab]);
  }
  return [...grouped.entries()].map(([spaceId, groupedTabs]) => ({
    space: spaceById.get(spaceId),
    tabs: groupedTabs,
  }));
}

export function removeTabFromSearchData(
  data: TabSearchData,
  target: Pick<PhiTab, "id" | "windowId">,
): TabSearchData {
  return {
    ...data,
    tabs: data.tabs.filter(
      (tab) => tab.id !== target.id || tab.windowId !== target.windowId,
    ),
  };
}

export function resolveOpenTabAddress(rawValue: string | undefined): string {
  return rawValue?.trim() || "chrome://newtab/";
}

export function resolveTabFaviconURL(rawValue: string | null): URL | undefined {
  if (!rawValue) {
    return undefined;
  }

  try {
    const url = new URL(rawValue);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

export function pinnedTabDisplaySpace(
  pin: PhiPinnedTab,
  targetSpaces: PhiSpace[],
): PhiSpace | undefined {
  return pin.scope === "app" ? undefined : targetSpaces[0];
}

export function resolveSpaceArgument(
  spaces: PhiSpace[],
  rawValue: string | undefined,
): string | undefined {
  const query = rawValue?.trim();
  if (!query) {
    return undefined;
  }

  const exactId = spaces.find((space) => space.id === query);
  if (exactId) {
    return exactId.id;
  }

  const normalized = query.toLowerCase();
  const matches = spaces.filter((space) => {
    const title = space.title.toLowerCase();
    const qualifiedTitle =
      `${space.title} — ${space.profileName}`.toLowerCase();
    return title === normalized || qualifiedTitle === normalized;
  });
  if (matches.length === 1) {
    return matches[0]?.id;
  }
  if (matches.length > 1) {
    const activeMatch = matches.filter((space) => space.isActive);
    if (activeMatch.length === 1) {
      return activeMatch[0]?.id;
    }
    throw new PhiError(
      "invalidArgument",
      `Multiple Phi Spaces match "${query}". Use "Space — Profile".`,
    );
  }
  throw new PhiError(
    "invalidArgument",
    `No Phi Space named "${query}" was found.`,
  );
}
