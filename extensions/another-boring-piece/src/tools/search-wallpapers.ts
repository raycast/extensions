import { fetchWallpaperCatalog } from "../wallpaper-catalog";
import { createWallpaperSearch } from "../wallpaper-search";
import type { Wallpaper } from "../utils";

type Input = {
  /** Search the full web gallery by title, artist, subject, color, mood, genre, or movement. All words must match. Supports the website's accent, prefix, typo, and artist-name matching. Use an empty string to browse all artworks. */
  query: string;
};

/** Searches the live gallery without changing the desktop or downloading files. */
export default async function tool(input: Input): Promise<Wallpaper[]> {
  const search = createWallpaperSearch(await fetchWallpaperCatalog());
  return search(input.query).map((wallpaper) => ({
    id: wallpaper.id,
    name: wallpaper.name,
    artist: wallpaper.artist,
    description: wallpaper.description,
    creationDate: wallpaper.creationDate,
    url: wallpaper.url,
    websiteUrl: wallpaper.websiteUrl,
  }));
}
