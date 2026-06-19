/**
 * Property price service — UK House Price Index (HPI) data.
 *
 * Fetches property price change data for a UK postcode by:
 * 1. Resolving the postcode to a region via postcodes.io (free, no auth)
 * 2. Querying the UK Land Registry HPI via their linked data API (free, no auth)
 * 3. Computing the percentage change between the valuation date and the latest data
 *
 * Coverage: England and Wales (Land Registry jurisdiction).
 * Scotland and Northern Ireland are not currently supported (different registries).
 *
 * Caching:
 * - Postcode→region mapping: cached permanently (postcodes don't change region)
 * - HPI data: cached daily (underlying data only updates monthly, but daily
 *   checks are harmless and consistent with the existing price cache pattern)
 *
 * This module is the single import point for property price data.
 * No other module should call postcodes.io or Land Registry directly.
 */

import { Cache } from "@raycast/api";
import { CACHE_PREFIX, CACHE_CAPACITY_BYTES } from "../utils/constants";
import { getTodayDateKey } from "../utils/formatting";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

/** Result of a property price change lookup */
export interface PropertyPriceChange {
  /** HPI percentage change since valuation (e.g. 4.2 means +4.2%) */
  changePercent: number;

  /** The region used for the HPI lookup (e.g. "London") */
  region: string;

  /** The Land Registry region slug (e.g. "london") */
  regionSlug: string;

  /** The month used for the valuation HPI (YYYY-MM format) */
  valuationMonth: string;

  /** The month used for the latest HPI (YYYY-MM format) */
  latestMonth: string;

  /** HPI value at valuation */
  valuationHPI: number;

  /** HPI value at latest available date */
  latestHPI: number;

  /** ISO 8601 timestamp when this data was fetched */
  fetchedAt: string;
}

/** Postcodes.io API response structure (relevant fields only) */
interface PostcodeResult {
  postcode: string;
  region: string | null;
  country: string;
  admin_district: string | null;
}

/** A single HPI data point from the Land Registry */
interface HPIDataPoint {
  date: string; // YYYY-MM format
  hpiValue: number;
}

// ──────────────────────────────────────────
// Cache Instance
// ──────────────────────────────────────────

const cache = new Cache({ capacity: CACHE_CAPACITY_BYTES });

// ──────────────────────────────────────────
// Region Mapping
// ──────────────────────────────────────────

/**
 * Maps postcodes.io region names to Land Registry region slugs.
 *
 * The Land Registry uses lowercase hyphenated slugs in their URIs.
 * postcodes.io returns human-readable region names for English postcodes.
 *
 * For Welsh postcodes, postcodes.io returns region as null and country as "Wales".
 */
const REGION_TO_SLUG: Record<string, string> = {
  London: "london",
  "South East": "south-east",
  "South West": "south-west",
  "East of England": "east-of-england",
  "East Midlands": "east-midlands",
  "West Midlands": "west-midlands",
  "Yorkshire and The Humber": "yorkshire-and-the-humber",
  "North East": "north-east",
  "North West": "north-west",
  // Wales is handled via the country field, not region
  Wales: "wales",
};

/**
 * Human-readable region names for display (reverse of slug mapping).
 */
const SLUG_TO_REGION: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_TO_SLUG).map(([name, slug]) => [slug, name]),
);

// ──────────────────────────────────────────
// Cache Key Builders
// ──────────────────────────────────────────

/**
 * Cache key for postcode→region mapping.
 * These are stable (postcodes don't move between regions), so no date component.
 */
function postcodeRegionKey(postcode: string): string {
  const normalised = postcode.replace(/\s+/g, "").toUpperCase();
  return `${CACHE_PREFIX.POSTCODE_REGION}:${normalised}`;
}

/**
 * Cache key for HPI data for a region.
 * Uses daily granularity to detect monthly data updates.
 */
function hpiCacheKey(regionSlug: string, dateKey: string): string {
  return `${CACHE_PREFIX.HPI}:${regionSlug}:${dateKey}`;
}

// ──────────────────────────────────────────
// Postcode → Region Resolution
// ──────────────────────────────────────────

/**
 * Resolves a UK postcode to a Land Registry region slug.
 *
 * Uses postcodes.io (free, no auth required, rate limited to ~1 req/sec for bulk).
 * Results are cached permanently since postcodes don't change region.
 *
 * @param postcode - UK postcode (e.g. "SW1A 1AA", "CF10 1AA")
 * @returns Object with region name and slug
 * @throws Error for invalid postcodes, Scottish/NI postcodes, or API failures
 */
export async function getRegionForPostcode(postcode: string): Promise<{ region: string; slug: string }> {
  const cacheKey = postcodeRegionKey(postcode);

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as { region: string; slug: string };
  }

  // Normalise postcode for the API (spaces are fine, postcodes.io handles them)
  const trimmed = postcode.trim();

  const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) {
    throw new Error(`Invalid postcode: "${postcode}". Please check and try again.`);
  }

  if (!response.ok) {
    throw new Error(`Postcode lookup failed (HTTP ${response.status}). Please try again later.`);
  }

  const data = (await response.json()) as { status: number; result: PostcodeResult };

  if (!data.result) {
    throw new Error(`No data returned for postcode "${postcode}".`);
  }

  const result = data.result;

  // Determine the region slug
  let region: string;
  let slug: string;

  if (result.country === "Scotland") {
    throw new Error(
      `Scottish postcodes are not yet supported. The UK HPI from Land Registry covers England and Wales only. ` +
        `Scotland uses the Registers of Scotland — support is planned for a future update.`,
    );
  }

  if (result.country === "Northern Ireland") {
    throw new Error(
      `Northern Ireland postcodes are not yet supported. The UK HPI from Land Registry covers England and Wales only. ` +
        `Northern Ireland uses the Land & Property Services — support is planned for a future update.`,
    );
  }

  if (result.country === "Wales") {
    region = "Wales";
    slug = "wales";
  } else if (result.region && REGION_TO_SLUG[result.region]) {
    region = result.region;
    slug = REGION_TO_SLUG[result.region];
  } else {
    throw new Error(
      `Unable to determine region for postcode "${postcode}" (country: ${result.country}, region: ${result.region ?? "unknown"}). ` +
        `This postcode may not be covered by the UK House Price Index.`,
    );
  }

  // Cache the result (permanent — no date in key)
  const entry = { region, slug };
  cache.set(cacheKey, JSON.stringify(entry));

  return entry;
}

// ──────────────────────────────────────────
// HPI Data Fetching
// ──────────────────────────────────────────

/**
 * Fetches HPI data points for a region from the Land Registry linked data API.
 *
 * Uses SPARQL to query the UK HPI dataset for all monthly index values
 * from a given start month onwards. Returns data sorted by date ascending.
 *
 * @param regionSlug - Land Registry region slug (e.g. "london", "south-east")
 * @param startMonth - Earliest month to fetch (YYYY-MM format, e.g. "2023-06")
 * @returns Array of HPI data points sorted by date ascending
 */
async function fetchHPIData(regionSlug: string, startMonth: string): Promise<HPIDataPoint[]> {
  const sparql = `
    PREFIX ukhpi: <http://landregistry.data.gov.uk/def/ukhpi/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?date ?hpi WHERE {
      ?item ukhpi:refRegion <http://landregistry.data.gov.uk/id/region/${regionSlug}> ;
            ukhpi:refMonth ?date ;
            ukhpi:housePriceIndex ?hpi .
      FILTER (?date >= "${startMonth}"^^xsd:gYearMonth)
    }
    ORDER BY ?date
  `.trim();

  const url = `https://landregistry.data.gov.uk/landregistry/query?output=json&query=${encodeURIComponent(sparql)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/sparql-results+json" },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch UK HPI data for region "${regionSlug}" (HTTP ${response.status}). ` +
        `The Land Registry API may be temporarily unavailable.`,
    );
  }

  const data = (await response.json()) as {
    results: {
      bindings: Array<{
        date: { type: string; value: string; datatype?: string };
        hpi: { type: string; value: string; datatype?: string };
      }>;
    };
  };

  const bindings = data.results?.bindings ?? [];

  if (bindings.length === 0) {
    return [];
  }

  return bindings
    .map((binding) => ({
      date: binding.date.value, // YYYY-MM format from xsd:gYearMonth
      hpiValue: parseFloat(binding.hpi.value),
    }))
    .filter((point) => !isNaN(point.hpiValue))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Retrieves HPI data for a region, using the cache where possible.
 *
 * Cache strategy: stores all fetched data points for a region keyed by today's date.
 * This means fresh HPI data is fetched at most once per day per region.
 *
 * @param regionSlug - Land Registry region slug
 * @param startMonth - Earliest month needed (YYYY-MM)
 * @returns Array of HPI data points
 */
async function getCachedHPIData(regionSlug: string, startMonth: string): Promise<HPIDataPoint[]> {
  const today = getTodayDateKey();
  const key = hpiCacheKey(regionSlug, today);

  // Check cache
  const cached = cache.get(key);
  if (cached) {
    const points = JSON.parse(cached) as HPIDataPoint[];
    // Verify the cached data covers our start month
    if (points.length > 0 && points[0].date <= startMonth) {
      return points;
    }
    // Cache doesn't cover our date range — re-fetch
  }

  // Fetch from API
  const points = await fetchHPIData(regionSlug, startMonth);

  // Cache the result
  if (points.length > 0) {
    cache.set(key, JSON.stringify(points));
  }

  return points;
}

// ──────────────────────────────────────────
// Public API
// ──────────────────────────────────────────

/**
 * Calculates the property price percentage change for a given postcode
 * since a valuation date.
 *
 * Flow:
 * 1. Resolve postcode → region via postcodes.io (cached permanently)
 * 2. Fetch HPI data for the region from valuation month onwards (cached daily)
 * 3. Find the HPI value closest to the valuation month
 * 4. Find the latest available HPI value
 * 5. Calculate the percentage change
 *
 * If HPI data is not available for the exact valuation month, the nearest
 * available month is used (within a 3-month tolerance).
 *
 * @param postcode - UK postcode (e.g. "SW1A 1AA")
 * @param valuationDate - ISO date string of the property valuation (e.g. "2023-06-15")
 * @returns Property price change data
 * @throws Error for unsupported postcodes, missing HPI data, or API failures
 *
 * @example
 * const change = await getPropertyPriceChange("SW1A 1AA", "2023-06-15");
 * // { changePercent: 4.2, region: "London", ... }
 */
export async function getPropertyPriceChange(postcode: string, valuationDate: string): Promise<PropertyPriceChange> {
  // 1. Resolve postcode to region
  const { region, slug } = await getRegionForPostcode(postcode);

  // 2. Determine the valuation month (YYYY-MM)
  const valDate = new Date(valuationDate);
  if (isNaN(valDate.getTime())) {
    throw new Error(`Invalid valuation date: "${valuationDate}". Expected ISO format (YYYY-MM-DD).`);
  }

  const valuationMonth = toYearMonth(valDate);

  // 3. Fetch HPI data from the valuation month onwards
  const hpiData = await getCachedHPIData(slug, valuationMonth);

  if (hpiData.length === 0) {
    throw new Error(
      `No UK HPI data available for ${SLUG_TO_REGION[slug] ?? slug} from ${valuationMonth} onwards. ` +
        `The Land Registry data may not yet cover this period (typically 2–3 months lag).`,
    );
  }

  // 4. Find HPI closest to the valuation month
  const valuationHPI = findClosestHPI(hpiData, valuationMonth, 3);
  if (!valuationHPI) {
    throw new Error(
      `No UK HPI data available near ${valuationMonth} for ${SLUG_TO_REGION[slug] ?? slug}. ` +
        `Data may not be available for dates this recent or this old.`,
    );
  }

  // 5. Latest available HPI is the last data point
  const latestHPI = hpiData[hpiData.length - 1];

  // 6. Calculate percentage change
  const changePercent = ((latestHPI.hpiValue - valuationHPI.hpiValue) / valuationHPI.hpiValue) * 100;

  return {
    changePercent,
    region,
    regionSlug: slug,
    valuationMonth: valuationHPI.date,
    latestMonth: latestHPI.date,
    valuationHPI: valuationHPI.hpiValue,
    latestHPI: latestHPI.hpiValue,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves cached property price change data synchronously.
 *
 * Returns undefined if no cached data is available. Useful for providing
 * instant initial data while an async fetch is in progress.
 *
 * This reconstructs the result from cached HPI data and postcode→region mapping.
 *
 * @param postcode - UK postcode
 * @param valuationDate - ISO date string
 * @returns Cached property price change or undefined
 */
export function getPropertyPriceChangeSync(postcode: string, valuationDate: string): PropertyPriceChange | undefined {
  // Check if we have a cached region
  const regionCacheKey = postcodeRegionKey(postcode);
  const cachedRegion = cache.get(regionCacheKey);
  if (!cachedRegion) return undefined;

  const { region, slug } = JSON.parse(cachedRegion) as { region: string; slug: string };

  // Check if we have cached HPI data
  const today = getTodayDateKey();
  const key = hpiCacheKey(slug, today);
  const cachedHPI = cache.get(key);
  if (!cachedHPI) return undefined;

  const hpiData = JSON.parse(cachedHPI) as HPIDataPoint[];
  if (hpiData.length === 0) return undefined;

  const valDate = new Date(valuationDate);
  if (isNaN(valDate.getTime())) return undefined;

  const valuationMonth = toYearMonth(valDate);
  const valuationHPI = findClosestHPI(hpiData, valuationMonth, 3);
  if (!valuationHPI) return undefined;

  const latestHPI = hpiData[hpiData.length - 1];
  const changePercent = ((latestHPI.hpiValue - valuationHPI.hpiValue) / valuationHPI.hpiValue) * 100;

  return {
    changePercent,
    region,
    regionSlug: slug,
    valuationMonth: valuationHPI.date,
    latestMonth: latestHPI.date,
    valuationHPI: valuationHPI.hpiValue,
    latestHPI: latestHPI.hpiValue,
    fetchedAt: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────

/**
 * Converts a Date to "YYYY-MM" format for HPI month matching.
 */
function toYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Finds the HPI data point closest to a target month, within a tolerance.
 *
 * First tries an exact match, then searches within `toleranceMonths`
 * in either direction (preferring the nearest match).
 *
 * @param data - Sorted array of HPI data points (ascending by date)
 * @param targetMonth - Target month in YYYY-MM format
 * @param toleranceMonths - Maximum months of drift allowed
 * @returns The closest HPI data point, or undefined if none within tolerance
 */
function findClosestHPI(data: HPIDataPoint[], targetMonth: string, toleranceMonths: number): HPIDataPoint | undefined {
  // Exact match first
  const exact = data.find((d) => d.date === targetMonth);
  if (exact) return exact;

  // Generate candidate months within tolerance
  const targetDate = new Date(targetMonth + "-01");
  let bestMatch: HPIDataPoint | undefined;
  let bestDistance = Infinity;

  for (const point of data) {
    const pointDate = new Date(point.date + "-01");
    const monthDiff = Math.abs(
      (pointDate.getFullYear() - targetDate.getFullYear()) * 12 + (pointDate.getMonth() - targetDate.getMonth()),
    );

    if (monthDiff <= toleranceMonths && monthDiff < bestDistance) {
      bestDistance = monthDiff;
      bestMatch = point;
    }
  }

  return bestMatch;
}

// ──────────────────────────────────────────
// Postcode Validation (lightweight, client-side)
// ──────────────────────────────────────────

/**
 * Validates a UK postcode format (lightweight regex check).
 *
 * This does NOT verify the postcode exists — that's done by postcodes.io.
 * This is purely for instant client-side feedback in the form.
 *
 * Accepted formats: "SW1A 1AA", "SW1A1AA", "EC1A 1BB", "CF10 1AA", etc.
 *
 * @param postcode - The postcode string to validate
 * @returns Error message if invalid, undefined if valid format
 */
export function validatePostcodeFormat(postcode: string): string | undefined {
  const trimmed = postcode.trim();

  if (trimmed.length === 0) {
    return "Postcode is required";
  }

  // UK postcode regex (permissive — allows with or without space)
  // Format: A9 9AA, A99 9AA, A9A 9AA, AA9 9AA, AA99 9AA, AA9A 9AA
  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

  if (!postcodeRegex.test(trimmed)) {
    return "Please enter a valid UK postcode (e.g. SW1A 1AA)";
  }

  return undefined;
}
