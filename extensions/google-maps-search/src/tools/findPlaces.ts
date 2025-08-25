import { getPreferenceValues } from "@raycast/api";
import { searchPlaces } from "../utils/googlePlacesApi";
import { makeSearchURL } from "../utils/url";
import { Preferences } from "../types";
import { showFailureToast } from "@raycast/utils";

/**
 * Input type for the find-places tool
 */
type FindPlacesInput = {
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
export async function findPlaces(input: FindPlacesInput): Promise<string> {
  try {
    // Get API key from preferences if needed in searchPlaces
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.googlePlacesApiKey) {
      throw new Error("Google Places API key is required");
    }
    const results = await searchPlaces(input.query);

    if (results.length === 0) {
      return `I couldn't find any places matching "${input.query}". Try a different search term.`;
    }

    // Ensure limit is a positive number
    const limit = Math.max(1, input.limit || 3);
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
export default findPlaces;
