import { fetchWallpaperCatalog } from "../wallpaper-catalog";
import { createWallpaperSearch } from "../wallpaper-search";
import type { Wallpaper } from "../utils";

type Input = {
  /** Search the full web gallery by title, artist, subject, color, mood, genre, or movement. All words must match. Supports the website's accent, prefix, typo, and artist-name matching. Use an empty string to browse a page of artworks. */
  query: string;
  /** Number of artworks to return. Defaults to 10 and is capped at 20. Must be a positive integer. */
  limit?: number;
  /** Zero-based result offset. Defaults to 0. For the next page, use the previous nextOffset with the same query and limit. */
  offset?: number;
};

type SearchPage = {
  wallpapers: Wallpaper[];
  total: number;
  nextOffset: number | null;
};

/** Searches one page of the live gallery without changing the desktop or downloading files. */
export default async function tool(input: Input): Promise<SearchPage> {
  const limit = input.limit ?? 10;
  const offset = input.offset ?? 0;
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new Error("Search limit must be a positive integer.");
  }
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error("Search offset must be a non-negative integer.");
  }

  const search = createWallpaperSearch(await fetchWallpaperCatalog());
  const matches = search(input.query);
  const wallpapers = matches
    .slice(offset, offset + Math.min(limit, 20))
    .map((wallpaper) => ({
      id: wallpaper.id,
      name: wallpaper.name,
      artist: wallpaper.artist,
      description: wallpaper.description,
      creationDate: wallpaper.creationDate,
      url: wallpaper.url,
      websiteUrl: wallpaper.websiteUrl,
    }));
  const nextOffset = offset + wallpapers.length;
  return {
    wallpapers,
    total: matches.length,
    nextOffset: nextOffset < matches.length ? nextOffset : null,
  };
}
