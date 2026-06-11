import { Cache, Image } from "@raycast/api";

const cache = new Cache();
const CACHE_KEY = "svgl-index";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SvglEntry {
  id: number;
  title: string;
  route: string | { light: string; dark: string };
}

interface CachedIndex {
  data: SvglEntry[];
  fetchedAt: number;
}

let inflightFetch: Promise<SvglEntry[]> | null = null;

async function loadSvglIndex(): Promise<SvglEntry[]> {
  try {
    const raw = cache.get(CACHE_KEY);
    if (raw) {
      const cached: CachedIndex = JSON.parse(raw);
      if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.data;
      }
    }
  } catch {
    // stale or corrupted cache, re-fetch
  }

  if (!inflightFetch) {
    inflightFetch = fetch("https://api.svgl.app")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        return res.json() as Promise<SvglEntry[]>;
      })
      .then((data) => {
        try {
          const cacheData = JSON.stringify({ data, fetchedAt: Date.now() });
          cache.set(CACHE_KEY, cacheData);
        } catch {
          // ignore cache write failure
        }
        return data;
      })
      .catch(() => [])
      .finally(() => {
        inflightFetch = null;
      });
  }

  return inflightFetch!;
}

const memoryCache = new Map<string, Image.ImageLike | undefined>();

async function fetchSvgAsDataUri(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const svg = await res.text();
    const base64 = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    return undefined;
  }
}

export async function getServiceIcon(name: string): Promise<Image.ImageLike | undefined> {
  const lowerName = name.toLowerCase();
  if (memoryCache.has(lowerName)) return memoryCache.get(lowerName);

  const index = await loadSvglIndex();
  const entry = index.find((e) => e.title.toLowerCase() === lowerName);

  if (!entry) {
    memoryCache.set(lowerName, undefined);
    return undefined;
  }

  let icon: Image.ImageLike | undefined;

  if (typeof entry.route === "string") {
    const dataUri = await fetchSvgAsDataUri(entry.route);
    icon = dataUri ? { source: dataUri } : undefined;
  } else {
    const lightDataUri = await fetchSvgAsDataUri(entry.route.light);
    const darkDataUri = await fetchSvgAsDataUri(entry.route.dark);

    if (lightDataUri && darkDataUri) {
      icon = {
        source: {
          light: lightDataUri,
          dark: darkDataUri,
        },
      };
    } else if (lightDataUri) {
      icon = { source: lightDataUri };
    } else if (darkDataUri) {
      icon = { source: darkDataUri };
    } else {
      icon = undefined;
    }
  }

  memoryCache.set(lowerName, icon);
  return icon;
}
