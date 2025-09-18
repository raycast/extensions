// utils/search.ts - Refactored

import { LocalStorage } from "@raycast/api";
import { getSimpleCurrentUser } from "./userHelpers";
import { showFailureToast } from "@raycast/utils";
import axios from "axios";
import { SearchOptions, SearchResult } from "../types";

// Constants
const SESSION_TOKEN_KEY = "webbites_session_token";
const API_URL = "https://api.webbites.io/search";

/**
 * Performs a search request to the WebBites API
 * @param options Search options including term, filters, sorting, and pagination
 * @returns Promise resolving to search results
 */
export const search = async (
  options: SearchOptions = {},
): Promise<SearchResult> => {
  try {
    // Extract and set default options
    const {
      searchTerm,
      orderBy = "relevance",
      page = 0,
      hitsPerPage = 20,
    } = options;

    // Get authentication information
    const { userId, sessionToken } = await getAuthInfo();

    // Make the search request
    const response = await makeSearchRequest(
      searchTerm || "",
      userId,
      sessionToken,
      orderBy,
      page,
      hitsPerPage,
    );

    return response.data.search;
  } catch (error) {
    console.error("Search error:", error);
    handleSearchError(error as Error);
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
 * @returns Axios response
 */
const makeSearchRequest = async (
  query: string,
  userId: string | null,
  sessionToken: string,
  orderBy: string,
  page: number,
  hitsPerPage: number,
) => {
  return await axios({
    method: "post",
    url: API_URL,
    headers: {
      "Content-Type": "application/json",
      "X-Parse-Session-Token": sessionToken,
    },
    data: {
      query,
      acl: userId,
      orderBy,
      page,
      hitsPerPage,
      filters: null,
    },
  });
};

/**
 * Handle search errors
 * @param error Error object
 */
const handleSearchError = (error: Error) => {
  if (axios.isAxiosError(error) && error.response) {
    console.error(
      "Server responded with:",
      error.response.status,
      error.response.data,
    );

    // Show appropriate error message based on status code
    if (error.response.status === 401) {
      showFailureToast(error, {
        title: "Authentication failed",
      });
    } else if (error.response.status === 429) {
      showFailureToast(error, {
        title: "Too many requests",
        message: "Please try again later",
      });
    } else {
      showFailureToast(error, {
        title: "Search failed",
        message: error.response.data?.message || "Please try again",
      });
    }
  }
};
