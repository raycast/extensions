import { getPreferenceValues } from "@raycast/api";
import { makeSearchURL } from "../utils/url";
import { searchPlaces as searchPlacesApi } from "../utils/googlePlacesApi";
import { Preferences } from "../types";
import { showFailureToast } from "@raycast/utils";

/**
 * Input type for the search-places tool
 */
type SearchPlacesInput = {
  /**
   * The search query for finding places
   */
  query: string;

  /**
   * Maximum number of results to return
   */
  limit?: number;
};

/**
 * Tool for finding places by search query
 */
// Default maximum number of results to return if not specified
const DEFAULT_LIMIT = 3;

export async function searchPlaces(input: SearchPlacesInput): Promise<string> {
  try {
    // Get API key from preferences if needed in searchPlaces
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.googlePlacesApiKey) {
      throw new Error("Google Places API key is required");
    }
    const results = await searchPlacesApi(input.query);

    if (results.length === 0) {
      return `I couldn't find any places matching "${input.query}". Try a different search term.`;
    }

    // Ensure limit is a positive number
    const limit = Math.max(1, input.limit || DEFAULT_LIMIT);
    const topResults = results.slice(0, limit);
    let response = `Here are some places matching "${input.query}":\n\n`;

    for (const place of topResults) {
      response += `- **${place.name}**\n`;
      response += `  Address: ${place.address}\n`;
      if (place.rating) response += `  Rating: ${place.rating}/5\n`;
      if (place.openNow !== undefined) response += `  Status: ${place.openNow ? "Open Now" : "Closed"}\n`;
      response += `  [View on Google Maps](${makeSearchURL(
        encodeURIComponent(place.name) + " " + encodeURIComponent(place.address)
      )})\n\n`;
    }

    if (results.length > limit) {
      response += `\n*${results.length - limit} more results available.*`;
    }

    return response;
  } catch (error) {
    showFailureToast(error, { title: "Error Searching Places", message: String(error) });
    return `Sorry, I encountered an error while searching for "${input.query}". Please check your API key and try again.`;
  }
}

// Export as default for Raycast tool compatibility
export default searchPlaces;
