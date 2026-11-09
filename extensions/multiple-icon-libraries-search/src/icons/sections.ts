import { categoryTitle } from "./libraries";
import { IconEntry, LibraryId, TileLayout } from "./types";

export const ALL = "all";
export const NEW = "new";

/** Labeled fits 7 across with names; Compact fits 8 and shows names on hover. */
export const COLUMNS: Record<TileLayout, number> = { labeled: 7, compact: 8 };

export function otherLayout(layout: TileLayout): TileLayout {
  return layout === "labeled" ? "compact" : "labeled";
}

export type SectionKind = "favorites" | "frequent" | "new" | "category" | "results" | "ai";

export interface Section {
  kind: SectionKind;
  title: string;
  icons: IconEntry[];
  /** Placeholder tiles shown while the section's icons are on their way. */
  placeholders?: number;
}

export interface CategoryOption {
  id: string;
  title: string;
}

/** The dropdown's categories, A–Z by title. */
export function categoryOptions(icons: IconEntry[]): CategoryOption[] {
  const ids = new Set(icons.flatMap((icon) => icon.categories));
  return [...ids].map((id) => ({ id, title: categoryTitle(id) })).sort((a, b) => a.title.localeCompare(b.title));
}

/** Icons the dropdown lets through: everything, the New set, or one category. */
export function inFilter(icon: IconEntry, filter: string, newNames: Set<string>): boolean {
  if (filter === ALL) return true;
  if (filter === NEW) return newNames.has(icon.name);
  return icon.categories.includes(filter);
}

export function byName(icons: IconEntry[], names: string[]): IconEntry[] {
  const index = new Map(icons.map((icon) => [icon.name, icon]));
  return names.map((name) => index.get(name)).filter((icon): icon is IconEntry => Boolean(icon));
}

/** Each icon under its home (first) category, sections A–Z. */
function groupedByCategory(icons: IconEntry[]): Section[] {
  const groups = new Map<string, IconEntry[]>();
  for (const icon of icons) {
    const home = icon.categories[0] ?? "other";
    const members = groups.get(home);
    if (members) members.push(icon);
    else groups.set(home, [icon]);
  }
  return [...groups]
    .map(([id, members]) => ({ kind: "category" as const, title: categoryTitle(id), icons: members }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export interface BrowseInput {
  icons: IconEntry[];
  filter: string;
  newNames: Set<string>;
  frequent: IconEntry[];
  newSample: IconEntry[];
  /** Favorites to lead the view with; empty when the Show Favorites setting is off. */
  favorites?: IconEntry[];
}

/**
 * The view before typing. Under All: Favorites (when the setting shows them), Frequently Used, a row of
 * New icons, then every icon by category. Under New or a category: just those icons.
 */
export function browseSections({
  icons,
  filter,
  newNames,
  frequent,
  newSample,
  favorites = [],
}: BrowseInput): Section[] {
  if (filter === NEW) return [{ kind: "new", title: "New", icons: icons.filter((icon) => newNames.has(icon.name)) }];
  if (filter !== ALL) {
    return [
      {
        kind: "category",
        title: categoryTitle(filter),
        icons: icons.filter((icon) => inFilter(icon, filter, newNames)),
      },
    ];
  }
  const leading: Section[] = [
    { kind: "favorites", title: "Favorites", icons: favorites },
    { kind: "frequent", title: "Frequently Used", icons: frequent },
    { kind: "new", title: "New", icons: newSample },
  ];
  return [...leading.filter((section) => section.icons.length), ...groupedByCategory(icons)];
}

/** Favorites first, each group keeping its own order. */
function favoritesFirst(icons: IconEntry[], favorites: Set<string>): IconEntry[] {
  return [...icons.filter((icon) => favorites.has(icon.name)), ...icons.filter((icon) => !favorites.has(icon.name))];
}

/**
 * The view while typing: favorites among the keyword results (best match first), the other keyword
 * results, then AI results that aren't already among them, favorites first. The other results are
 * headed More Results under Favorites, and Keyword Results otherwise. While AI works, the AI section holds
 * `aiPlaceholders` placeholder tiles instead.
 */
export function searchSections(
  results: IconEntry[],
  aiResults: IconEntry[] | undefined,
  aiPlaceholders = 0,
  favorites: Set<string> = new Set(),
): Section[] {
  const shown = new Set(results.map((icon) => icon.name));
  const favoriteResults = results.filter((icon) => favorites.has(icon.name));
  const otherResults = results.filter((icon) => !favorites.has(icon.name));
  const sections: Section[] = [];
  if (favoriteResults.length) sections.push({ kind: "favorites", title: "Favorites", icons: favoriteResults });
  if (otherResults.length) {
    sections.push({
      kind: "results",
      title: favoriteResults.length ? "More Results" : "Keyword Results",
      icons: otherResults,
    });
  }
  if (aiPlaceholders) {
    sections.push({ kind: "ai", title: "AI Results", icons: [], placeholders: aiPlaceholders });
    return sections;
  }
  const extra = (aiResults ?? []).filter((icon) => !shown.has(icon.name));
  if (extra.length) sections.push({ kind: "ai", title: "AI Results", icons: favoritesFirst(extra, favorites) });
  return sections;
}

/** The toast after Tab: how many AI results it added below the keyword results. */
export function aiAddedTitle(added: number): string {
  if (!added) return "No new AI results";
  return `${added} AI result${added === 1 ? "" : "s"} below`;
}

/** Tiles shown per page. Raycast builds every tile's action menu up front, so all 6,000 at once runs out of memory. */
export const PAGE_SIZE = 400;

/** The first `limit` tiles across sections, in order, and whether more are left to load. */
export function limitSections(sections: Section[], limit: number): { sections: Section[]; hasMore: boolean } {
  const shown: Section[] = [];
  let left = limit;
  for (const section of sections) {
    if (left <= 0) break;
    shown.push(section.icons.length <= left ? section : { ...section, icons: section.icons.slice(0, left) });
    left -= section.icons.length;
  }
  return { sections: shown, hasMore: left < 0 || shown.length < sections.length };
}

/**
 * The tile to select: the first one of a search or filtered view, since Raycast otherwise keeps
 * the old selection index while the tiles change under it. The start view is left alone, because
 * using an icon there reorders Frequently Used.
 */
export function firstSelection(sections: Section[], searchText: string, filter: string): string | undefined {
  if (!searchText.trim() && filter === ALL) return undefined;
  const first = sections[0]?.icons[0];
  return first ? `${sections[0].kind}:${first.name}` : undefined;
}

/**
 * Where an icon's tile is now, as `kind:name`, so the highlight can follow it when adding or removing a
 * favorite moves it between sections of a search. Undefined when it isn't shown.
 */
export function tileOf(sections: Section[], name: string): string | undefined {
  const section = sections.find(({ icons }) => icons.some((icon) => icon.name === name));
  return section ? `${section.kind}:${name}` : undefined;
}

/** Resolve only real tiles in the current grid, never a spinner or a selection from another library. */
export function selectedIconName(sections: Section[], library: LibraryId, id: string | null): string | undefined {
  if (id == null) return undefined;
  for (const { kind, icons } of sections) {
    const prefix = `${library}:${kind}:`;
    if (!id.startsWith(prefix)) continue;
    const name = id.slice(prefix.length);
    if (icons.some((icon) => icon.name === name)) return name;
  }
  return undefined;
}
