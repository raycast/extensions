import { LocalStorage } from "@raycast/api";
import { getSimpleCurrentUser } from "./userHelpers";
import { showFailureToast } from "@raycast/utils";
import axios from "axios"; // Use axios instead of fetch
import { SearchOptions, SearchResult } from "../types";

/**
 * Performs a search request to the server
 * @param options Search options including term, filters, sorting, and pagination
 * @returns Search results from the server
 */
export const search = async (
  options: SearchOptions = {},
): Promise<SearchResult> => {
  try {
    // Get default values from options or use defaults
    const searchTerm = options.searchTerm ?? "";
    const filters = options.filters ?? null;
    const orderBy = options.orderBy ?? "relevance";
    const page = options.page ?? 0;
    const hitsPerPage = options.hitsPerPage ?? 20;

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
    }

    // Get session token for authentication
    const sessionToken = await LocalStorage.getItem<string>(
      "webbites_session_token",
    );
    if (!sessionToken) {
      throw new Error("No session token available");
    }

    // Make the search request
    // console.log(`Searching for: "${searchTerm}" with filters:`, filters);
    // console.log(`page: "${page}`);

    // Make request with axios
    const response = await axios({
      method: "post",
      url: "https://api.webbites.io/search",
      headers: {
        "Content-Type": "application/json",
        "X-Parse-Session-Token": sessionToken,
      },
      data: {
        query: searchTerm,
        acl: userId,
        orderBy: orderBy,
        page: page,
        hitsPerPage: hitsPerPage,
        filters: filters,
      },
    });

    // axios returns data directly
    return response.data.search;
  } catch (error) {
    console.error("Search error 2:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        "Server responded with:",
        error.response.status,
        error.response.data,
      );
    }
    throw error;
  }
};
