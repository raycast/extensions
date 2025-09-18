import { getNearbyPlaces, geocodeAddress, getApiKey } from "../utils/googlePlacesApi";
import { makeSearchURL } from "../utils/url";
import { formatDistance, calculateDistance } from "../utils/common";
import { showFailureToast } from "@raycast/utils";

/**
 * Input type for the findNearbyPlaces tool
 */
type FindNearbyPlacesInput = {
  /**
   * The type of place to search for (e.g., restaurant, cafe, etc.)
   */
  type: string;

  /**
   * The location to search near (address or place name)
   */
  location: string;

  /**
   * The search radius in meters (default: 1000)
   */
  radius?: number;

  /**
   * Whether to only show open places
   */
  openNow?: boolean;

  /**
   * Maximum number of results to return
   */
  limit?: number;
};

/**
 * Tool for searching places near a specified location
 */
export default async function (input: FindNearbyPlacesInput): Promise<string> {
  try {
    // Use the getApiKey function instead of directly accessing preferences.apiKey
    // This ensures consistent API key handling across the application
    const apiKey = getApiKey();
    if (!apiKey) {
      return "Please set your Google Places API key in preferences.";
    }
    const radius = input.radius || 1000;
    const limit = input.limit || 5;

    // Geocode the location to get coordinates
    const locationCoords = await geocodeAddress(input.location);
    if (!locationCoords) {
      return `I couldn't find the location "${input.location}". Please try a different location.`;
    }

    // Search for nearby places
    const places = await getNearbyPlaces(locationCoords, input.type, radius);

    // Filter by openNow if specified
    const filteredPlaces = input.openNow ? places.filter((place) => place.openNow) : places;

    if (filteredPlaces.length === 0) {
      return `I couldn't find any ${input.openNow ? "open " : ""}${input.type} places near "${
        input.location
      }". Try a different location or place type.`;
    }

    const topPlaces = filteredPlaces.slice(0, limit);
    let response = `Here are ${input.openNow ? "open " : ""}${input.type} places near "${input.location}":\n\n`;

    for (const place of topPlaces) {
      const distance = calculateDistance(
        locationCoords.lat,
        locationCoords.lng,
        place.location.lat,
        place.location.lng
      );

      response += `- **${place.name}**\n`;
      response += `  Address: ${place.address}\n`;
      response += `  Distance: ${formatDistance(distance)}\n`;
      if (place.rating) response += `  Rating: ${place.rating}/5\n`;
      if (place.openNow !== undefined) response += `  Status: ${place.openNow ? "Open Now" : "Closed"}\n`;
      response += `  [View on Google Maps](${makeSearchURL(encodeURIComponent(`${place.name} ${place.address}`))})\n\n`;
    }

    if (filteredPlaces.length > limit) {
      response += `\n*${filteredPlaces.length - limit} more results available.*`;
    }

    return response;
  } catch (error) {
    showFailureToast(error, { title: "Error Searching Nearby Places" });
    return `Sorry, I encountered an error while searching for ${input.type} places near "${input.location}". Please check your API key and try again.`;
  }
}

/**
 * Confirmation message for the findNearbyPlaces tool
 */
export function confirmation(input: FindNearbyPlacesInput): string {
  return `Search for ${input.openNow ? "open " : ""}${input.type} places near "${input.location}"`;
}
