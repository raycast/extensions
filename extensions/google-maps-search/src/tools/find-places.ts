import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { searchPlaces } from "../utils/google-places-api";
import { makeSearchURL } from "../utils/url";
import { Preferences } from "../types";

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
export default async function (input: FindPlacesInput): Promise<string> {
  try {
    // Get API key from preferences if needed in searchPlaces
    getPreferenceValues<Preferences>();
    const results = await searchPlaces(input.query);

    if (results.length === 0) {
      return `I couldn't find any places matching "${input.query}". Try a different search term.`;
    }

    const limit = input.limit || 3;
    const topResults = results.slice(0, limit);
    let response = `Here are some places matching "${input.query}":\n\n`;

    for (const place of topResults) {
      response += `- **${place.name}**\n`;
      response += `  Address: ${place.address}\n`;
      if (place.rating) response += `  Rating: ${place.rating}/5\n`;
      if (place.openNow !== undefined) response += `  Status: ${place.openNow ? "Open Now" : "Closed"}\n`;
      response += `  [View on Google Maps](${makeSearchURL(place.name + " " + place.address)})\n\n`;
    }

    if (results.length > limit) {
      response += `\n*${results.length - limit} more results available.*`;
    }

    return response;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error Searching Places",
      message: String(error),
    });
    return `Sorry, I encountered an error while searching for "${input.query}". Please check your API key and try again.`;
  }
}
