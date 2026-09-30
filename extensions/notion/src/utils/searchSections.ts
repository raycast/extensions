import type { Page } from "./notion";

export function getSearchSections(query: string, results: Page[], pinned: Page[], recent: Page[]) {
  const matches = (page: Page) => (page.title ?? "Untitled").toLowerCase().includes(query.trim().toLowerCase());
  const pinnedPages = pinned.filter(matches);
  const pinnedIds = new Set(pinnedPages.map((page) => page.id));
  const recentPages = recent.filter((page) => matches(page) && !pinnedIds.has(page.id));
  const recentIds = new Set(recentPages.map((page) => page.id));

  return [
    { title: "Pinned", pages: pinnedPages, isPinned: true },
    { title: "Recent", pages: recentPages, isPinned: false },
    {
      title: "Search",
      pages: results.filter((page) => !pinnedIds.has(page.id) && !recentIds.has(page.id)),
      isPinned: false,
    },
  ];
}
