import { getPreferenceValues } from "@raycast/api";
import { getPlaceDetails, searchPlaces } from "../utils/googlePlacesApi";
import { makeSearchURL, makeDirectionsURL } from "../utils/url";
import { formatPriceLevel, formatRating } from "../utils/common";
import { Preferences } from "../types";
import { showFailureToast } from "@raycast/utils";

/**
 * Input type for the get-place-details tool
 */
type GetPlaceDetailsInput = {
  /**
   * The place ID or name to get details for
   */
  place: string;

  /**
   * Whether the input is a place ID (true) or a place name (false)
   */
  isPlaceId?: boolean;
};

/**
 * Tool for getting detailed information about a specific place
 */
export default async function (input: GetPlaceDetailsInput): Promise<string> {
  try {
    // Get preferences for preferred transport mode
    const preferences = getPreferenceValues<Preferences>();
    let placeId = input.isPlaceId ? input.place : null;

    // If not a place ID, search for the place first
    if (!placeId) {
      const searchResults = await searchPlaces(input.place);
      if (searchResults.length === 0) {
        return `I couldn't find any place matching "${input.place}". Please try a different name.`;
      }
      placeId = searchResults[0].placeId;
    }

    // Get detailed information about the place
    const details = await getPlaceDetails(placeId);

    let response = `# ${details.name}\n\n`;

    // Basic information
    response += `**Address**: ${details.address}\n`;
    if (details.phoneNumber) response += `**Phone**: ${details.phoneNumber}\n`;
    if (details.website) response += `**Website**: [${details.website}](${details.website})\n`;

    // Rating and price level
    if (details.rating) {
      response += `**Rating**: ${formatRating(details.rating, 1, details.userRatingsTotal)}\n`;
    }
    if (details.priceLevel !== undefined) {
      response += `**Price Level**: ${formatPriceLevel(details.priceLevel)}\n`;
    }

    // Opening hours
    if (details.openingHours) {
      response += `\n**Status**: ${details.openingHours.isOpen ? "Open Now" : "Closed"}\n`;
      if (details.openingHours.weekdayText && details.openingHours.weekdayText.length > 0) {
        response += "\n**Opening Hours**:\n";
        for (const day of details.openingHours.weekdayText) {
          response += `- ${day}\n`;
        }
      }
    }

    // Categories/types
    if (details.types && details.types.length > 0) {
      response += "\n**Categories**: ";
      response += details.types
        .slice(0, 5)
        .map((type) => type.replace(/_/g, " "))
        .join(", ");
      response += "\n";
    }

    // Links
    response += "\n**Links**:\n";
    const searchQuery = `${details.name} ${details.address}`.trim();
    response += `- [View on Google Maps](${makeSearchURL(searchQuery)})\n`;
    response += `- [Get Directions](${makeDirectionsURL("", details.address, preferences.preferredMode)})\n`;

    // Reviews
    if (details.reviews && details.reviews.length > 0) {
      response += "\n## Top Reviews\n\n";
      for (const review of details.reviews.slice(0, 2)) {
        response += `### ${review.authorName} - ${formatRating(review.rating)}\n`;
        response += `*${review.relativeTimeDescription}*\n\n`;
        response += `${review.text}\n\n`;
        response += "---\n\n";
      }
    }

    return response;
  } catch (error) {
    showFailureToast(error, { title: "Error Getting Place Details", message: String(error) });
    return `Sorry, I encountered an error while getting details for "${input.place}". Please check your API key and try again.`;
  }
}
