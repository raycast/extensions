// What the Find Icons AI tool returns, worked out from saved catalogs without Raycast, so it can be tested.

import { iconName, LIBRARIES } from "./libraries";
import { aiRank, keywordSearch, normalizePhrase, prepareSearch, SavedKeywords } from "./search";
import { IconEntry, LibraryId } from "./types";

export const DEFAULT_PER_LIBRARY = 5;
export const MAX_PER_LIBRARY = 10;

export interface ToolLibrary {
  library: LibraryId;
  icons: IconEntry[];
  /** The user's own words for icons (Edit Keywords and remembered AI picks). */
  saved?: SavedKeywords;
  favorites?: string[];
}

export interface FoundIcon {
  library: string;
  /** The icon's own name, as in `ticket-01`. */
  name: string;
  /** The name code imports, as in `Ticket01Icon`. */
  importName: string;
  /** How to use it in React. */
  reactCode: string;
  /** The icon as a 24 px `currentColor` SVG. */
  svg: string;
  url: string;
}

/** The comma-separated keywords in a query, each normalized; the whole query when it has no commas. */
export function toolKeywords(query: string): string[] {
  return [...new Set(query.split(",").map(normalizePhrase).filter(Boolean))];
}

/** How many icons to return per library: the asked-for number within 1 to 10, else 5. */
export function perLibrary(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_PER_LIBRARY;
  return Math.min(MAX_PER_LIBRARY, Math.max(1, Math.round(limit)));
}

/**
 * The best icons for a query in one library: icons matching every word of the first keyword (names, tags,
 * and the user's own words), then icons answering the most keywords. Favorites go first among equals.
 */
export function bestIcons(source: ToolLibrary, query: string, count: number): IconEntry[] {
  const items = prepareSearch(source.icons);
  const keywords = toolKeywords(query);
  if (!keywords.length) return [];
  const ranked = [...keywordSearch(items, keywords[0], source.saved ?? {}), ...aiRank(items, keywords, count * 4)];
  const unique = [...new Map(ranked.map((icon) => [icon.name, icon])).values()].slice(0, count * 2);
  const favorites = new Set(source.favorites ?? []);
  const sorted = [
    ...unique.filter((icon) => favorites.has(icon.name)),
    ...unique.filter((icon) => !favorites.has(icon.name)),
  ];
  return sorted.slice(0, count);
}

export function foundIcon(library: LibraryId, icon: IconEntry, svg: string): FoundIcon {
  const info = LIBRARIES[library];
  return {
    library: info.title,
    name: icon.name,
    importName: iconName(library, icon, "import", false),
    reactCode: info.reactCode(icon, undefined, svg),
    svg,
    url: info.pageUrl(icon),
  };
}
