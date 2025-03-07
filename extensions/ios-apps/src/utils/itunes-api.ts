// iTunes API utility functions
import nodeFetch from "node-fetch";
import { AppDetails, ITunesResponse, ITunesResult } from "../types";

// Handle both ESM and CommonJS versions of node-fetch
const fetch = nodeFetch;

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
    price: itunesData.price?.toString() || base.price || "0",
    genres: itunesData.genres && itunesData.genres.length > 0 ? itunesData.genres : base.genres || [],
    size: itunesData.fileSizeBytes || base.size || "0",
    contentRating: itunesData.contentAdvisoryRating || base.contentRating || "",
    // Set the artwork URLs from iTunes API
    artworkUrl60: itunesData.artworkUrl60 || base.artworkUrl60,
    artworkUrl512: itunesData.artworkUrl512 || base.artworkUrl512,
    // Additional iTunes-specific fields
    averageUserRating: itunesData.averageUserRating || base.averageUserRating,
    averageUserRatingForCurrentVersion:
      itunesData.averageUserRatingForCurrentVersion || base.averageUserRatingForCurrentVersion,
    userRatingCount: itunesData.userRatingCount || base.userRatingCount,
    userRatingCountForCurrentVersion:
      itunesData.userRatingCountForCurrentVersion || base.userRatingCountForCurrentVersion,
    releaseDate: itunesData.releaseDate || base.releaseDate,
    currentVersionReleaseDate: itunesData.currentVersionReleaseDate || base.currentVersionReleaseDate,
    trackViewUrl: itunesData.trackViewUrl || base.trackViewUrl,
    artistViewUrl: itunesData.artistViewUrl || base.artistViewUrl,
    screenshotUrls: itunesData.screenshotUrls || base.screenshotUrls,
  };
}

/**
 * Fetch app details from iTunes Search API
 * @param bundleId Bundle ID of the app
 * @returns iTunes app details or null if not found
 */
export async function fetchITunesAppDetails(bundleId: string): Promise<ITunesResult | null> {
  try {
    console.log(`[iTunes API] Fetching app details for bundleId: ${bundleId}`);
    const url = `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}&country=us&entity=software`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[iTunes API] Request failed with status: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as ITunesResponse;

    if (data.resultCount === 0 || !data.results || data.results.length === 0) {
      console.log(`[iTunes API] No results found for bundleId: ${bundleId}`);
      return null;
    }

    console.log(`[iTunes API] Successfully retrieved details for ${bundleId}`);
    return data.results[0];
  } catch (error) {
    console.error(`[iTunes API] Error fetching details: ${error}`);
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
    console.log(`[iTunes API] Searching for apps with term: "${term}", limit: ${limit}`);
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=us&entity=software&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[iTunes API] Search request failed with status: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as ITunesResponse;

    if (data.resultCount === 0 || !data.results || data.results.length === 0) {
      console.log(`[iTunes API] No search results found for term: "${term}"`);
      return [];
    }

    console.log(`[iTunes API] Found ${data.resultCount} results for term: "${term}"`);
    return data.results;
  } catch (error) {
    console.error(`[iTunes API] Error searching apps: ${error}`);
    return [];
  }
}

/**
 * Enriches app details with data from iTunes API
 */
export async function enrichAppDetails(app: AppDetails): Promise<AppDetails> {
  try {
    console.log(`[iTunes API] Enriching app details for bundleId: ${app.bundleId}`);
    const itunesData = await fetchITunesAppDetails(app.bundleId);

    if (itunesData) {
      console.log(`[iTunes API] Successfully retrieved iTunes data for ${app.bundleId}`);
      // Use the utility function to convert iTunes data to AppDetails
      return convertITunesResultToAppDetails(itunesData, app);
    }

    console.log(`[iTunes API] No iTunes data found for ${app.bundleId}, using basic details only`);
    // If no iTunes data, ensure genres is at least an empty array and iconUrl is set
    return {
      ...app,
      genres: app.genres || [],
      sellerName: app.sellerName || "Unknown Developer",
      // Ensure iconUrl is set even if empty
      iconUrl: app.iconUrl || "",
    };
  } catch (error) {
    console.error("[iTunes API] Error enriching app details:", error);
    // Ensure genres is at least an empty array and iconUrl is set
    return {
      ...app,
      genres: app.genres || [],
      sellerName: app.sellerName || "Unknown Developer",
      // Ensure iconUrl is set even if empty
      iconUrl: app.iconUrl || "",
    };
  }
}
