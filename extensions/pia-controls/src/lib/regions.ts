import { LocalStorage } from "@raycast/api";
import { AUTO_REGION, Region } from "../types";

/** Recents and favorites come back from local storage, so ids are re-checked before reaching piactl. */
export const VALID_REGION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidRegionId(id: string): boolean {
  return id.length > 0 && id.length <= 64 && VALID_REGION_ID.test(id);
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

/**
 * piactl ids are the catalog display names slugified ("US New York" -> "us-new-york").
 * The API's own `id` field uses a different scheme, so the name is the join key.
 */
export function toRegionId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

const CATALOG_CACHE_KEY = "region_catalog_v1";
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CATALOG_BYTES = 4 * 1024 * 1024;

interface CachedCatalog {
  fetchedAt: number;
  regions: Region[];
}

function parseCatalog(body: string): Region[] {
  // One line of JSON followed by a signature block.
  const payload = JSON.parse(body.split("\n")[0]) as { regions?: ApiRegion[] };
  if (!Array.isArray(payload.regions)) {
    throw new Error("PIA server list response had no regions");
  }

  return payload.regions
    .filter((r) => r && typeof r.name === "string" && typeof r.country === "string")
    .map((r) => ({
      id: toRegionId(r.name),
      name: r.name,
      countryCode: r.country.toUpperCase(),
      country: countryName(r.country),
      portForward: !!r.port_forward,
      geo: !!r.geo,
      autoRegion: !!r.auto_region,
      offline: !!r.offline,
    }))
    .filter((r) => VALID_REGION_ID.test(r.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Cached for a day; a stale cache is served when the network call fails. */
export async function fetchRegions(): Promise<Region[]> {
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
    return cached.regions;
  }

  try {
    const res = await fetch(SERVER_LIST_URL);
    if (!res.ok) {
      throw new Error(`PIA server list request failed: ${res.status}`);
    }
    const body = await res.text();
    if (body.length > MAX_CATALOG_BYTES) {
      throw new Error("PIA server list response was unexpectedly large");
    }

    const regions = parseCatalog(body);
    await LocalStorage.setItem(
      CATALOG_CACHE_KEY,
      JSON.stringify({
        fetchedAt: Date.now(),
        regions,
      } satisfies CachedCatalog),
    );
    return regions;
  } catch (e) {
    if (cached) return cached.regions;
    throw e;
  }
}

export const FAVORITES_KEY = "favorite_regions";
export const RECENTS_KEY = "recent_regions";
