// iTunes API utility functions
import fetch from "node-fetch";
import { showFailureToast } from "@raycast/utils";
import { AppDetails, ITunesResponse, ITunesResult } from "../types";
import { logger } from "./logger";
import { ITUNES_API_BASE_URL, ITUNES_LOOKUP_ENDPOINT, ITUNES_SEARCH_ENDPOINT } from "./constants";

// iTunes API Constants (imported from centralized constants)
const ITUNES_DEFAULT_COUNTRY = "us";
const ITUNES_SOFTWARE_ENTITY = "software";

// Rate limiting utilities
interface RateLimiter {
  lastRequest: number;
  minInterval: number;
}

const apiRateLimiter: RateLimiter = {
  lastRequest: 0,
  minInterval: 100, // 100ms between API requests
};

/**
 * Rate limit function calls
 */
async function rateLimit(limiter: RateLimiter): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - limiter.lastRequest;

  if (timeSinceLastRequest < limiter.minInterval) {
    const waitTime = limiter.minInterval - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  limiter.lastRequest = Date.now();
}

/**
 * Convert iTunes API result to AppDetails format
 * @param itunesData iTunes API result
 * @param baseDetails Optional base details to merge with
 * @returns Formatted AppDetails object
 */
export function convertITunesResultToAppDetails(
  itunesData: ITunesResult,
  baseDetails?: Partial<AppDetails>,
): AppDetails {
  // Start with base details or empty object
  const base = baseDetails || {};

  return {
    // Use base details as fallback
    id: itunesData.trackId?.toString() || base.id || "",
    name: itunesData.trackName || base.name || "",
    version: itunesData.version || base.version || "",
    bundleId: itunesData.bundleId || base.bundleId || "",
    description: itunesData.description || base.description || "",
    // Set the iconUrl as a fallback using the highest resolution available
    iconUrl: itunesData.artworkUrl512 || itunesData.artworkUrl100 || itunesData.artworkUrl60 || base.iconUrl || "",
    sellerName: itunesData.sellerName || base.sellerName || "Unknown Developer",
    artistName: itunesData.artistName || base.artistName || "",
    price: itunesData.price?.toString() || base.price || "0",
    currency: itunesData.currency || base.currency || "USD",
    genres: itunesData.genres && itunesData.genres.length > 0 ? itunesData.genres : base.genres || [],
    size: itunesData.fileSizeBytes?.toString() || base.size || "0",
    contentRating: itunesData.contentAdvisoryRating || base.contentRating || "",
    // Set the artwork URLs from iTunes API
    artworkUrl60: itunesData.artworkUrl60 || base.artworkUrl60 || "",
    artworkUrl512: itunesData.artworkUrl512 || base.artworkUrl512 || "",
    // Additional iTunes-specific fields
    averageUserRating: itunesData.averageUserRating || base.averageUserRating || 0,
    averageUserRatingForCurrentVersion:
      itunesData.averageUserRatingForCurrentVersion || base.averageUserRatingForCurrentVersion || 0,
    userRatingCount: itunesData.userRatingCount || base.userRatingCount || 0,
    userRatingCountForCurrentVersion:
      itunesData.userRatingCountForCurrentVersion || base.userRatingCountForCurrentVersion || 0,
    releaseDate: itunesData.releaseDate || base.releaseDate || "",
    currentVersionReleaseDate: itunesData.currentVersionReleaseDate || base.currentVersionReleaseDate,
    trackViewUrl: itunesData.trackViewUrl || base.trackViewUrl,
    artistViewUrl: itunesData.artistViewUrl || base.artistViewUrl,
    // Screenshot URLs from iTunes API
    screenshotUrls: itunesData.screenshotUrls || base.screenshotUrls || [],
    ipadScreenshotUrls: itunesData.ipadScreenshotUrls || base.ipadScreenshotUrls || [],
    appletvScreenshotUrls: itunesData.appletvScreenshotUrls || base.appletvScreenshotUrls || [],
    // Store the raw iTunes API data for access to all fields
    itunesData: itunesData,
  };
}

/**
 * Fetch app details from iTunes Search API
 * @param bundleId Bundle ID of the app
 * @returns iTunes app details or null if not found
 */
export async function fetchITunesAppDetails(bundleId: string): Promise<ITunesResult | null> {
  try {
    // Apply rate limiting
    await rateLimit(apiRateLimiter);

    // Construct the iTunes API URL
    const url = new URL(ITUNES_API_BASE_URL + ITUNES_LOOKUP_ENDPOINT);
    url.searchParams.append("bundleId", bundleId);
    url.searchParams.append("country", ITUNES_DEFAULT_COUNTRY);
    url.searchParams.append("entity", ITUNES_SOFTWARE_ENTITY);

    logger.log(`[iTunes API] Fetching app details for ${bundleId} from ${url.toString()}`);

    // Fetch data from iTunes API
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`iTunes API returned ${response.status}: ${response.statusText}`);
    }

    // Parse the response
    const data = (await response.json()) as ITunesResponse;

    // Check if we got any results
    if (data.resultCount === 0 || !data.results || data.results.length === 0) {
      logger.log(`[iTunes API] No results found for ${bundleId}`);
      return null;
    }

    // Return the first result
    return data.results[0];
  } catch (error) {
    console.error(`[iTunes API] Error fetching app details for ${bundleId}:`, error);
    await showFailureToast(error, { title: `Failed to fetch iTunes data for ${bundleId}` });
    return null;
  }
}

/**
 * Search for apps using iTunes Search API
 * @param term Search term
 * @param limit Maximum number of results to return
 * @returns Array of iTunes search results
 */
export async function searchITunesApps(term: string, limit = 20): Promise<ITunesResult[]> {
  try {
    // Apply rate limiting
    await rateLimit(apiRateLimiter);

    // Construct the iTunes API URL
    const url = new URL(ITUNES_API_BASE_URL + ITUNES_SEARCH_ENDPOINT);
    url.searchParams.append("term", term);
    url.searchParams.append("country", ITUNES_DEFAULT_COUNTRY);
    url.searchParams.append("entity", ITUNES_SOFTWARE_ENTITY);
    url.searchParams.append("limit", limit.toString());

    logger.log(`[iTunes API] Searching for "${term}" with limit ${limit} from ${url.toString()}`);

    // Fetch data from iTunes API
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`iTunes API returned ${response.status}: ${response.statusText}`);
    }

    // Parse the response
    const data = (await response.json()) as ITunesResponse;

    // Check if we got any results
    if (data.resultCount === 0 || !data.results || data.results.length === 0) {
      logger.log(`[iTunes API] No results found for "${term}"`);
      return [];
    }

    // Return all results
    return data.results;
  } catch (error) {
    logger.error(`[iTunes API] Error searching for "${term}":`, error);
    await showFailureToast(error, { title: `Failed to search iTunes for "${term}"` });
    return [];
  }
}

/**
 * Enriches app details with data from iTunes API
 * @param app The app details to enrich
 * @returns Enriched app details
 */
export async function enrichAppDetails(app: AppDetails): Promise<AppDetails> {
  try {
    logger.log(`[iTunes API] Enriching app details for bundleId: ${app.bundleId}`);
    const itunesData = await fetchITunesAppDetails(app.bundleId);

    if (itunesData) {
      logger.log(`[iTunes API] Successfully retrieved iTunes data for ${app.bundleId}`);
      // Use the utility function to convert iTunes data to AppDetails
      return convertITunesResultToAppDetails(itunesData, app);
    }

    logger.log(`[iTunes API] No iTunes data found for ${app.bundleId}, using basic details only`);
    // If no iTunes data, ensure genres is at least an empty array and iconUrl is set
    return {
      ...app,
      genres: app.genres || [],
      sellerName: app.sellerName || "Unknown Developer",
      // Ensure iconUrl is set even if empty
      iconUrl: app.iconUrl || "",
    };
  } catch (error) {
    logger.error(`[iTunes API] Error enriching app details for ${app.bundleId}:`, error);
    return app; // Return the original app details if enrichment fails
  }
}
