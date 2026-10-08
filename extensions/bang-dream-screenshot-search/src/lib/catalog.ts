import type { CatalogFilter, Screenshot, ScreenshotManifest } from "../types";

export function normalizeSearchValue(value: string): string {
  return value.normalize("NFKC").toLowerCase().trim();
}

export function searchTokens(query: string): string[] {
  return normalizeSearchValue(query).split(/\s+/).filter(Boolean);
}

export function matchesSearch(screenshot: Screenshot, query: string, seriesTitle: string): boolean {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return true;
  const haystack = normalizeSearchValue(
    `${screenshot.title} ${screenshot.rawName} ${seriesTitle} episode ${screenshot.episode} ep${screenshot.episode}`,
  );
  return tokens.every((token) => haystack.includes(token));
}

export type FilterCatalogInput = {
  manifest: ScreenshotManifest;
  filter: CatalogFilter;
  favoriteIds: string[];
  recentIds: string[];
  query: string;
};

export function filterCatalog({ manifest, filter, favoriteIds, recentIds, query }: FilterCatalogInput): Screenshot[] {
  const screenshotById = new Map(manifest.screenshots.map((screenshot) => [screenshot.id, screenshot]));
  const seriesTitleById = new Map(manifest.series.map((series) => [series.id, series.title]));

  let candidates: Screenshot[];
  if (filter === "favorites") {
    candidates = favoriteIds.flatMap((id) => {
      const screenshot = screenshotById.get(id);
      return screenshot ? [screenshot] : [];
    });
  } else if (filter === "recent") {
    candidates = recentIds.flatMap((id) => {
      const screenshot = screenshotById.get(id);
      return screenshot ? [screenshot] : [];
    });
  } else if (filter.startsWith("series:")) {
    const seriesId = filter.slice("series:".length);
    candidates = manifest.screenshots.filter((screenshot) => screenshot.seriesId === seriesId);
  } else {
    candidates = manifest.screenshots;
  }

  return candidates.filter((screenshot) =>
    matchesSearch(screenshot, query, seriesTitleById.get(screenshot.seriesId) ?? screenshot.seriesId),
  );
}
