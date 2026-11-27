import { CACHE_KEYS, getCachedValue, setCachedValue } from "./cache";
import { parseODataFeed } from "./parser";
import { ChocoPackage } from "./types";

const BASE_URL = "https://community.chocolatey.org/api/v2";
const REQUEST_HEADERS = {
  Accept: "application/atom+xml, application/xml",
  "User-Agent": "Raycast-Chocolatey-Extension/1.0",
};
const METADATA_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

function escapeODataLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

async function fetchFeed(
  url: string,
  signal?: AbortSignal,
): Promise<ChocoPackage[]> {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal,
  });
  if (!response.ok) {
    throw new Error(`Chocolatey API returned HTTP ${response.status}`);
  }
  const xml = await response.text();
  return parseODataFeed(xml);
}

/**
 * Searches Chocolatey Community Repository via OData v2 Search endpoint.
 */
export async function searchCommunityPackages(
  query: string,
  options: {
    top?: number;
    skip?: number;
    includePrerelease?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<ChocoPackage[]> {
  const trimmed = query.trim();
  const top = options.top ?? 30;
  const skip = options.skip ?? 0;
  const includePrerelease = options.includePrerelease ?? false;

  if (!trimmed) {
    return fetchPopularCommunityPackages({
      top,
      includePrerelease,
      signal: options.signal,
    });
  }

  const filter = includePrerelease
    ? "IsAbsoluteLatestVersion"
    : "IsLatestVersion";
  const escaped = escapeODataLiteral(trimmed);
  const url = `${BASE_URL}/Search()?$filter=${encodeURIComponent(filter)}&$skip=${skip}&$top=${top}&searchTerm=${encodeURIComponent(`'${escaped}'`)}&targetFramework=''&includePrerelease=${includePrerelease}`;
  return fetchFeed(url, options.signal);
}

/**
 * Fetches popular Chocolatey packages sorted by download count when search query is empty.
 */
export async function fetchPopularCommunityPackages(
  options: {
    top?: number;
    includePrerelease?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<ChocoPackage[]> {
  const top = options.top ?? 30;
  const includePrerelease = options.includePrerelease ?? false;
  const filter = includePrerelease
    ? "IsAbsoluteLatestVersion"
    : "IsLatestVersion";
  const url = `${BASE_URL}/Packages()?$filter=${encodeURIComponent(filter)}&$orderby=${encodeURIComponent("DownloadCount desc")}&$top=${top}`;
  return fetchFeed(url, options.signal);
}

/**
 * Fetches metadata for a single package ID from Chocolatey Community Repository.
 */
export async function fetchCommunityPackageById(
  id: string,
  signal?: AbortSignal,
): Promise<ChocoPackage | null> {
  const cacheKey = `${CACHE_KEYS.metadataPrefix}${id.toLowerCase()}`;
  const cached = getCachedValue<ChocoPackage | null>(cacheKey, METADATA_TTL_MS);
  if (cached !== undefined) {
    return cached;
  }

  const escaped = escapeODataLiteral(id);
  const filter = `Id eq '${escaped}' and IsLatestVersion`;
  const url = `${BASE_URL}/Packages()?$filter=${encodeURIComponent(filter)}&$top=1`;
  const results = await fetchFeed(url, signal);
  const pkg = results[0] ?? null;
  setCachedValue(cacheKey, pkg);
  return pkg;
}

/**
 * Fetches metadata with bounded concurrency for a list of package IDs
 * (used to enrich installed/outdated lists with icons and descriptions).
 */
export async function fetchCommunityPackagesByIds(
  ids: string[],
  signal?: AbortSignal,
): Promise<Map<string, ChocoPackage>> {
  const resultMap = new Map<string, ChocoPackage>();
  const missingIds: string[] = [];

  for (const id of ids) {
    const key = id.toLowerCase();
    const cached = getCachedValue<ChocoPackage | null>(
      `${CACHE_KEYS.metadataPrefix}${key}`,
      METADATA_TTL_MS,
    );
    if (cached !== undefined) {
      if (cached) {
        resultMap.set(key, cached);
      }
    } else {
      missingIds.push(id);
    }
  }

  const concurrency = 5;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < missingIds.length) {
      if (signal?.aborted) {
        return;
      }
      const id = missingIds[nextIndex++];
      try {
        const pkg = await fetchCommunityPackageById(id, signal);
        if (pkg) {
          resultMap.set(pkg.id.toLowerCase(), pkg);
        }
      } catch {
        // Metadata enrichment is best-effort; ignore transient API errors
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, missingIds.length) }, () =>
      worker(),
    ),
  );
  return resultMap;
}
