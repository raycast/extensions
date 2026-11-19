import type { HistoryEntry, Tab } from "../types";

/**
 * Pure helpers for the unified Search Helium command. Kept free of
 * `@raycast/api` so they can be covered by Vitest.
 */

export type SearchHeliumSection = "tabs" | "bookmarks" | "history" | "web";
export type SearchHeliumViewMode = "all" | SearchHeliumSection;

export const SEARCH_HELIUM_VIEW_MODES: { value: SearchHeliumViewMode; title: string }[] = [
  { value: "all", title: "All" },
  { value: "tabs", title: "Open Tabs" },
  { value: "bookmarks", title: "Bookmarks" },
  { value: "history", title: "History" },
  { value: "web", title: "Search Web" },
];

export function isSearchHeliumViewMode(value: string): value is SearchHeliumViewMode {
  return SEARCH_HELIUM_VIEW_MODES.some((mode) => mode.value === value);
}

/**
 * Whether a section is rendered for the current view mode and query.
 *
 * In "All", bookmarks and web results only appear once the user types, so the
 * empty state stays focused on open tabs and recent history (matching the Dia
 * extension's Search command). Selecting a single section always shows it.
 */
export function shouldShowSection(
  section: SearchHeliumSection,
  viewMode: SearchHeliumViewMode,
  query: string,
): boolean {
  if (viewMode !== "all") return viewMode === section;
  if (section === "bookmarks" || section === "web") return query.trim().length > 0;
  return true;
}

/**
 * Comparison key for "same page": scheme and host are case-insensitive, while
 * path, query and fragment keep their case (`/Foo` and `/foo` can differ). A
 * trailing slash is ignored. Unparseable values fall back to the trimmed text.
 */
function urlKey(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    const rest = `${parsed.pathname}${parsed.search}${parsed.hash}`.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${rest}`;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

/**
 * Drop history entries for pages that are already listed as open tabs, so the
 * same page is not shown twice. See {@link urlKey} for what counts as the same
 * page.
 */
export function excludeOpenTabUrls(history: HistoryEntry[], tabs: Tab[]): HistoryEntry[] {
  if (history.length === 0 || tabs.length === 0) return history;

  const openUrls = new Set(tabs.map((tab) => urlKey(tab.url)));
  return history.filter((entry) => !openUrls.has(urlKey(entry.url)));
}
