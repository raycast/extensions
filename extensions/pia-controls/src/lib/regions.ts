import { LocalStorage } from "@raycast/api";
import { listRegionIds } from "./pia";
import { AUTO_REGION, Region } from "../types";

/**
 * Ids from local storage are re-checked before reaching piactl. Permissive by
 * design: PIA replaces only whitespace, so ids may contain dots and non-ASCII
 * letters (`dedicated-sweden-000.000.000.000`).
 */
export function isValidRegionId(id: string): boolean {
  if (id.length === 0 || id.length > 128) return false;
  for (const ch of id) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x20 || code === 0x7f) return false;
  }
  return true;
}

const SERVER_LIST_URL = "https://serverlist.piaservers.net/vpninfo/servers/v6";

interface ApiRegion {
  id: string;
  name: string;
  country: string;
  auto_region?: boolean;
  port_forward?: boolean;
  geo?: boolean;
  offline?: boolean;
}

type RegionMetadata = Omit<Region, "id">;

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string): string {
  try {
    return countryNames.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** Bundled rather than loaded from a CDN, so browsing regions makes no third-party requests. */
export function flagAsset(countryCode: string): string {
  return `flags/${countryCode.toLowerCase()}.png`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Fallback title for ids the catalog does not describe, e.g. "us-new-york" -> "US New York". */
function titleFromId(id: string): string {
  const words = id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  if (words[0]?.length === 2) words[0] = words[0].toUpperCase();
  return words.join(" ");
}

export const AUTO_REGION_ENTRY: Region = {
  id: AUTO_REGION,
  name: "Automatic",
  countryCode: "",
  country: "Fastest available region",
  portForward: false,
  geo: false,
  autoRegion: true,
  offline: false,
};

const CATALOG_CACHE_KEY = "region_catalog_v2";
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CATALOG_BYTES = 4 * 1024 * 1024;

interface CachedCatalog {
  fetchedAt: number;
  entries: [string, RegionMetadata][];
}

/** Catalog ids and piactl ids use different schemes, so index under both. */
function indexCatalog(body: string): Map<string, RegionMetadata> {
  const payload = JSON.parse(body.split("\n")[0]) as { regions?: ApiRegion[] };
  if (!Array.isArray(payload.regions)) {
    throw new Error("PIA server list response had no regions");
  }

  const index = new Map<string, RegionMetadata>();
  for (const r of payload.regions) {
    if (!r || typeof r.name !== "string" || typeof r.country !== "string") continue;
    const metadata: RegionMetadata = {
      name: r.name,
      countryCode: r.country.toUpperCase(),
      country: countryName(r.country),
      portForward: !!r.port_forward,
      geo: !!r.geo,
      autoRegion: !!r.auto_region,
      offline: !!r.offline,
    };
    for (const key of [slugify(r.name), typeof r.id === "string" ? slugify(r.id) : ""]) {
      if (key && !index.has(key)) index.set(key, metadata);
    }
  }
  return index;
}

/** Cached for a day; a stale cache is served when the network call fails. */
async function loadCatalog(): Promise<Map<string, RegionMetadata>> {
  const cachedRaw = await LocalStorage.getItem<string>(CATALOG_CACHE_KEY);
  let cached: CachedCatalog | undefined;
  if (cachedRaw) {
    try {
      cached = JSON.parse(cachedRaw) as CachedCatalog;
    } catch {
      cached = undefined;
    }
  }

  if (cached && Date.now() - cached.fetchedAt < CATALOG_TTL_MS) {
    return new Map(cached.entries);
  }

  try {
    const res = await fetch(SERVER_LIST_URL);
    if (!res.ok) throw new Error(`PIA server list request failed: ${res.status}`);
    const body = await res.text();
    if (body.length > MAX_CATALOG_BYTES) {
      throw new Error("PIA server list response was unexpectedly large");
    }

    const index = indexCatalog(body);
    await LocalStorage.setItem(
      CATALOG_CACHE_KEY,
      JSON.stringify({ fetchedAt: Date.now(), entries: [...index] } satisfies CachedCatalog),
    );
    return index;
  } catch (e) {
    if (cached) return new Map(cached.entries);
    throw e;
  }
}

/**
 * `piactl get regions` is the only authoritative list of ids PIA accepts, so it
 * drives the result and the catalog only decorates it.
 */
export async function loadRegions(cliPath: string): Promise<Region[]> {
  const ids = (await listRegionIds(cliPath)).filter((id) => id !== AUTO_REGION && isValidRegionId(id));

  let catalog = new Map<string, RegionMetadata>();
  try {
    catalog = await loadCatalog();
  } catch {
    // Offline: ids alone still let the user connect.
  }

  return ids
    .map((id) => {
      const metadata = catalog.get(id);
      return metadata
        ? { id, ...metadata }
        : {
            id,
            name: titleFromId(id),
            countryCode: "",
            country: "",
            portForward: false,
            geo: false,
            autoRegion: false,
            offline: false,
          };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const FAVORITES_KEY = "favorite_regions";
export const RECENTS_KEY = "recent_regions";
