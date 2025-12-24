/**
 * Context7 API client
 * Lightweight fetch-based client for Context7 REST API
 */

import { getPreferenceValues, environment } from "@raycast/api";
import { SearchResponse, Preferences, APIError } from "./types";

const BASE_URL = "https://context7.com/api/v2";

/**
 * Debug logging helper (development mode only)
 */
function debugLog(message: string, data?: unknown) {
  if (environment.isDevelopment) {
    console.log(`[Context7 API] ${message}`, data || "");
  }
}

/**
 * Build headers for API requests
 * @param apiKey - Optional API key for authentication
 */
export function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

/**
 * Handle API errors and convert to standardized format
 */
export function handleAPIError(error: unknown, status: number): APIError {
  // Network errors
  if (status === -1) {
    return {
      status: -1,
      message: "Network error. Please check your connection.",
      showPreferencesLink: false,
    };
  }

  // HTTP errors
  switch (status) {
    case 401:
      return {
        status: 401,
        message: "Invalid API Key. Please check your configuration.",
        showPreferencesLink: true,
      };
    case 404:
      return {
        status: 404,
        message: "Library not found.",
        showPreferencesLink: false,
      };
    case 429:
      return {
        status: 429,
        message: "Rate limit exceeded. Configure an API Key for higher limits.",
        showPreferencesLink: true,
      };
    case 500:
      return {
        status: 500,
        message: "Server error. Please try again later.",
        showPreferencesLink: false,
      };
    default:
      return {
        status,
        message: `Request failed with status ${status}`,
        showPreferencesLink: false,
      };
  }
}

/**
 * Search for libraries by keyword
 * @param query - Search term
 * @returns Promise resolving to search results
 * @throws APIError on failure
 */
export async function search(query: string): Promise<SearchResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const url = `${BASE_URL}/search?query=${encodeURIComponent(query)}`;
  const headers = buildHeaders(preferences.apiKey);

  debugLog(`Search request: ${query}`);

  try {
    const response = await fetch(url, { headers });

    debugLog(`Search response status: ${response.status}`);

    if (!response.ok) {
      throw handleAPIError(null, response.status);
    }

    const data = (await response.json()) as SearchResponse;
    debugLog(`Search results count: ${data.results?.length || 0}`);
    return data;
  } catch (error) {
    // If it's already an APIError, rethrow it
    if (error && typeof error === "object" && "status" in error) {
      throw error;
    }

    // Network or other errors
    throw handleAPIError(error, -1);
  }
}

/**
 * Get documentation for a library
 * @param libraryId - Library ID from search result (e.g., "/owner/repo")
 * @param tokens - Optional token limit for documentation
 * @returns Promise resolving to Markdown content
 * @throws APIError on failure
 */
export async function getDocs(libraryId: string, tokens?: number): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();

  // libraryId format: "/owner/repo" or "/websites/domain"
  // Remove leading slash for path construction
  const path = libraryId.startsWith("/") ? libraryId.slice(1) : libraryId;

  // Add tokens parameter if provided
  const tokenParam = tokens ? `&tokens=${tokens}` : "";
  const url = `${BASE_URL}/docs/code/${path}?type=txt${tokenParam}`;

  debugLog(`Docs request: ${libraryId}`);

  // For documentation endpoint, we don't need Accept: application/json
  const headers: Record<string, string> = {};
  if (preferences.apiKey) {
    headers.Authorization = `Bearer ${preferences.apiKey}`;
  }

  try {
    const response = await fetch(url, { headers });

    debugLog(`Docs response status: ${response.status}`);

    if (!response.ok) {
      throw handleAPIError(null, response.status);
    }

    const text = await response.text();
    debugLog(`Docs content length: ${text.length} characters`);
    return text;
  } catch (error) {
    // If it's already an APIError, rethrow it
    if (error && typeof error === "object" && "status" in error) {
      throw error;
    }

    // Network or other errors
    throw handleAPIError(error, -1);
  }
}

/**
 * Get llms.txt content for a library
 * @param libraryId - Library ID from search result (e.g., "/owner/repo")
 * @param tokens - Optional token limit (defaults to preference or 10000)
 * @returns Promise resolving to llms.txt content
 * @throws APIError on failure
 */
export async function getLlmsTxt(libraryId: string, tokens?: number): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();

  // Get tokens from parameter, preference, or default to 10000
  const tokenLimit = tokens || parseInt(preferences.defaultTokens || "10000", 10);

  // Build the llms.txt URL
  const url = `https://context7.com${libraryId}/llms.txt?tokens=${tokenLimit}`;

  debugLog(`llms.txt request: ${libraryId} with ${tokenLimit} tokens`);

  const headers: Record<string, string> = {};
  if (preferences.apiKey) {
    headers.Authorization = `Bearer ${preferences.apiKey}`;
  }

  try {
    const response = await fetch(url, { headers });

    debugLog(`llms.txt response status: ${response.status}`);

    if (!response.ok) {
      throw handleAPIError(null, response.status);
    }

    const text = await response.text();
    debugLog(`llms.txt content length: ${text.length} characters`);
    return text;
  } catch (error) {
    // If it's already an APIError, rethrow it
    if (error && typeof error === "object" && "status" in error) {
      throw error;
    }

    // Network or other errors
    throw handleAPIError(error, -1);
  }
}
