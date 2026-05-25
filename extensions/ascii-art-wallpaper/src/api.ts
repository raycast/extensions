import { LocalStorage } from "@raycast/api";

const BASE_URL = "https://collectionapi.metmuseum.org/public/collection/v1";
const HEADERS = { "User-Agent": "Raycast-ASCII-Art-Wallpaper/1.0" };

export interface Artwork {
  objectID: number;
  title: string;
  artistDisplayName: string;
  objectDate: string;
  medium: string;
  department: string;
  primaryImage: string;
  primaryImageSmall: string;
}

// In-memory cache for the current session
const memoryCache: Map<string, { data: Artwork[]; ts: number }> = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h — artwork metadata doesn't change

async function getCached(key: string): Promise<Artwork[] | null> {
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.ts < CACHE_TTL) return mem.data;

  const raw = await LocalStorage.getItem<string>(`cache:${key}`);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { data: Artwork[]; ts: number };
      if (Date.now() - parsed.ts < CACHE_TTL) {
        memoryCache.set(key, parsed);
        return parsed.data;
      }
    } catch {
      /* stale */
    }
  }
  return null;
}

async function setCache(key: string, data: Artwork[]) {
  const entry = { data, ts: Date.now() };
  memoryCache.set(key, entry);
  await LocalStorage.setItem(`cache:${key}`, JSON.stringify(entry));
}

async function fetchArtworksBatch(ids: number[]): Promise<Artwork[]> {
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const res = await fetch(`${BASE_URL}/objects/${id}`, {
        headers: HEADERS,
      });
      if (!res.ok) return null;
      return res.json() as Promise<Artwork>;
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<Artwork> =>
        r.status === "fulfilled" && r.value !== null && !!r.value.primaryImageSmall,
    )
    .map((r) => r.value);
}

export async function searchArtworks(query: string, limit = 20): Promise<Artwork[]> {
  const cacheKey = `search:${query}:${limit}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query || "painting")}&hasImages=true`;
  const response = await fetch(searchUrl, { headers: HEADERS });
  if (!response.ok) throw new Error(`Search failed: ${response.status}`);

  const data = (await response.json()) as {
    total: number;
    objectIDs: number[] | null;
  };
  if (!data.objectIDs || data.objectIDs.length === 0) return [];

  const ids = data.objectIDs.slice(0, limit);
  const artworks = await fetchArtworksBatch(ids);
  await setCache(cacheKey, artworks);
  return artworks;
}

export function getImageUrl(artwork: Artwork): string {
  return artwork.primaryImage || artwork.primaryImageSmall;
}

export function getThumbnailUrl(artwork: Artwork): string {
  return artwork.primaryImageSmall;
}

// Curated selection of iconic artworks (verified with images)
const FEATURED_IDS = [
  436535, // Wheat Field with Cypresses — Van Gogh
  436524, // Sunflowers — Van Gogh
  436528, // Irises — Van Gogh
  437980, // Cypresses — Van Gogh
  437998, // Olive Trees — Van Gogh
  437984, // La Berceuse — Van Gogh
  436575, // View of Toledo — El Greco
  437869, // Juan de Pareja — Velázquez
  437879, // Study of a Young Woman — Vermeer
  436965, // The Monet Family in Their Garden — Manet
  436947, // Boating — Manet
  438012, // Bouquet of Chrysanthemums — Renoir
  435882, // Still Life with Apples — Cézanne
  337496, // Head of the Virgin — Leonardo da Vinci
  436838, // The Fortune-Teller — Georges de La Tour
  435621, // Joan of Arc — Bastien-Lepage
  437329, // Abduction of the Sabine Women — Poussin
  437854, // Whalers — Turner
  44918, // Rough Waves — Ogata Kōrin
  436840, // Self-Portrait with Two Pupils — Labille-Guiard
];

export async function fetchFeatured(): Promise<Artwork[]> {
  const cached = await getCached("featured");
  if (cached) return cached;

  const artworks = await fetchArtworksBatch(FEATURED_IDS);
  await setCache("featured", artworks);
  return artworks;
}
