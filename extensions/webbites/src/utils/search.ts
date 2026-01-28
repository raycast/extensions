// utils/search.ts - Refactored

import { LocalStorage, openExtensionPreferences } from "@raycast/api";
import { getSimpleCurrentUser } from "./userHelpers";
import { showFailureToast } from "@raycast/utils";
import { SearchOptions, SearchResult } from "../types";
import { API_ENDPOINTS, BACKEND_API_URL } from "./env";
// import { generateKey } from "./auth";

// Constants
const SESSION_TOKEN_KEY = "webbites_session_token";
const API_URL = `${BACKEND_API_URL}${API_ENDPOINTS.SEARCH}`;

/**
 * Performs a search request to the WebBites API
 * @param options Search options including term, filters, sorting, and pagination
 * @returns Promise resolving to search results
 */
export const search = async (options: SearchOptions = {}): Promise<SearchResult> => {
  try {
    // Extract and set default options
    const { searchTerm, orderBy = "relevance", page = 0, hitsPerPage = 20 } = options;

    // Get authentication information
    const { userId, sessionToken } = await getAuthInfo();

    // Make the search request
    const response = await makeSearchRequest(searchTerm || "", userId, sessionToken, orderBy, page, hitsPerPage);
    const data = await response.json();
    return data.search as SearchResult;
  } catch (error) {
    console.error("Search error 1:", error);
    await handleSearchError(error as Error);
    throw error;
  }
};

/**
 * Get user ID and session token for authentication
 * @returns Object containing userId and sessionToken
 */
const getAuthInfo = async (): Promise<{
  userId: string | null;
  sessionToken: string;
}> => {
  // Get the current user ID
  let userId = null;
  const user = await getSimpleCurrentUser();

  if (user) {
    userId = user.id;
  } else {
    console.warn("No authenticated user found for search");
    showFailureToast({
      title: "No user found",
      message: "Please login again",
    });
    throw new Error("User authentication required");
  }

  // Get session token for authentication
  const sessionToken = await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);
  if (!sessionToken) {
    throw new Error("No session token available");
  }

  return { userId, sessionToken };
};

/**
 * Make the search request to the API
 * @param query Search query
 * @param userId User ID
 * @param sessionToken Session token
 * @param orderBy Order by parameter
 * @param page Page number
 * @param hitsPerPage Items per page
 * @param filters Additional filters
 * @returns Fetch Response
 */
class HttpError extends Error {
  response: Response;
  constructor(response: Response) {
    super(`Request failed with status ${response.status}`);
    this.name = "HttpError";
    this.response = response;
  }
}
const makeSearchRequest = async (
  query: string,
  userId: string | null,
  sessionToken: string,
  orderBy: string,
  page: number,
  hitsPerPage: number,
) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      query,
      acl: userId,
      orderBy,
      page,
      hitsPerPage,
      filters: null,
    }),
  });

  if (!response.ok) {
    throw new HttpError(response);
  }
  return response;
};

/**
 * Handle search errors
 * @param error Error object
 */
const handleSearchError = async (error: unknown) => {
  const err = error as { response?: Response };
  const response = err?.response;

  if (response instanceof Response) {
    console.error("Server responded with:", response.status);

    let errorData: { message?: string } | null = null;
    try {
      // Clone before parsing to avoid locking the body
      errorData = await response.clone().json();
    } catch {
      // Ignore JSON parse errors
    }

    if (response.status === 401) {
      // try {
      //   const { sessionToken } = await getAuthInfo();
      //   const key = await generateKey(sessionToken);
      //   console.log("Generated new key:", key);
      // } catch (e) {
      //   console.error("Key generation failed:", e);
      // }
      showFailureToast(error as Error, {
        title: "Session expired",
        message: "Your session has expired. Please re-enter your credentials to continue.",
        primaryAction: {
          title: "Open Preferences",
          onAction: async () => {
            // Clear session token and user data to force fresh login
            await LocalStorage.removeItem(SESSION_TOKEN_KEY);
            await LocalStorage.removeItem("webbites_user_data");
            openExtensionPreferences();
          },
        },
      });
    } else if (response.status === 429) {
      showFailureToast(error as Error, {
        title: "Too many requests",
        message: "Please try again later",
      });
    } else {
      showFailureToast(error as Error, {
        title: "Search failed",
        message: errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
      });
    }
  } else {
    showFailureToast(error as Error, {
      title: "Search failed",
    });
  }
};
