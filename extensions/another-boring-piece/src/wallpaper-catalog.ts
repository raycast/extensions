import type { Wallpaper } from "./utils";

export const GALLERY_URL = "https://anotherboring.day/";

export type CatalogWallpaper = Wallpaper & {
  websiteUrl: string;
  tags: string[];
  searchTerms: string[];
  genre: string;
  movement: string;
};

type GalleryArtwork = {
  id: string;
  slug: string;
  name: string;
  artist: string;
  meta: string;
  thumb: string;
  description?: string;
  genre?: string;
  movement?: string;
  tags?: string[];
  searchTerms?: string[];
  upcoming?: boolean;
  soundscape?: string;
};

function isGalleryArtwork(value: unknown): value is GalleryArtwork {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    ["id", "slug", "name", "artist", "meta", "thumb"].every(
      (key) => typeof item[key] === "string",
    ) &&
    ["description", "genre", "movement", "soundscape"].every(
      (key) => item[key] === undefined || typeof item[key] === "string",
    ) &&
    ["tags", "searchTerms"].every(
      (key) =>
        item[key] === undefined ||
        (Array.isArray(item[key]) &&
          item[key].every((term) => typeof term === "string")),
    ) &&
    (item.upcoming === undefined || typeof item.upcoming === "boolean")
  );
}

function getFullImageUrl(thumb: string): string {
  const url = new URL(thumb);
  if (url.hostname === "res.cloudinary.com") {
    return thumb.replace(/\/upload\/[^/]*\{w\}[^/]*\//, "/upload/");
  }
  if (url.hostname === "imagedelivery.net") {
    return thumb.replace(/\/[^/]+$/, "/full");
  }
  return thumb.replace("{w}", "2400");
}

export function parseWallpaperCatalog(html: string): CatalogWallpaper[] {
  // The website embeds its complete search catalog as JSON. Read data only;
  // never evaluate the website's scripts or depend on its hashed bundle URL.
  const match = html.match(
    /<script\b(?=[^>]*\bid=["']gallery-data["'])[^>]*>([\s\S]*?)<\/script\s*>/i,
  );
  if (!match)
    throw new Error("The website's wallpaper catalog is unavailable.");

  const data: unknown = JSON.parse(match[1]);
  if (!Array.isArray(data) || !data.every(isGalleryArtwork)) {
    throw new Error("The website returned an invalid wallpaper catalog.");
  }

  // Match the web gallery's visibility rule, including soundscape previews.
  return data
    .filter((artwork) => !artwork.upcoming || artwork.soundscape)
    .map((artwork) => ({
      id: artwork.id,
      name: artwork.name,
      artist: artwork.artist,
      creationDate: artwork.meta.startsWith(`${artwork.artist}, `)
        ? artwork.meta.slice(artwork.artist.length + 2)
        : "",
      description: artwork.description ?? "",
      url: getFullImageUrl(artwork.thumb),
      websiteUrl: `${GALLERY_URL}art/${encodeURIComponent(artwork.slug)}`,
      genre: artwork.genre ?? "",
      movement: artwork.movement ?? "",
      tags: artwork.tags ?? [],
      searchTerms: artwork.searchTerms ?? [],
    }));
}

export async function fetchWallpaperCatalog(): Promise<CatalogWallpaper[]> {
  const response = await fetch(GALLERY_URL, {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch wallpaper catalog: ${response.status}`);
  }
  return parseWallpaperCatalog(await response.text());
}
