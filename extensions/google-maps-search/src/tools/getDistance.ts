import { getPreferenceValues } from "@raycast/api";
import { geocodeAddress } from "../utils/googlePlacesApi";
import { makeDirectionsURL } from "../utils/url";
import { Preferences, TransportType } from "../types";
import { showFailureToast } from "@raycast/utils";
import { calculateHaversineDistance } from "../utils/locationHelpers";

/**
 * Input type for the get-distance tool
 */
type GetDistanceInput = {
  /**
   * The destination address or place name
   */
  destination: string;

  /**
   * The starting address or place name (optional)
   */
  origin?: string;

  /**
   * The transportation mode (driving, walking, bicycling, transit)
   */
  mode?: TransportType | string;
};

/**
 * Tool for calculating distance between locations
 */
export async function getDistance(input: GetDistanceInput): Promise<string> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    let mode = input.mode || preferences.preferredMode || TransportType.Driving;

    // Validate that mode is one of the allowed values
    const validModes = [TransportType.Driving, TransportType.Walking, TransportType.Cycling, TransportType.Transit];
    // Convert string mode to enum if needed
    if (typeof mode === "string") {
      // Find the matching enum value
      const enumValue = Object.values(TransportType).find((val) => val === mode);
      if (enumValue) {
        mode = enumValue as TransportType;
      } else {
        mode = TransportType.Driving; // Default if not found
      }
    }

    if (!validModes.includes(mode as TransportType)) {
      console.warn(`Invalid transportation mode: ${mode}. Defaulting to driving.`);
      mode = TransportType.Driving;
    }

    // Determine origin
    const origin = input.origin || preferences.homeAddress;
    if (!origin) {
      return "Please provide an origin address or set your home address in preferences.";
    }

    // Validate destination and origin by geocoding
    const destCoords = await geocodeAddress(input.destination);
    if (!destCoords) {
      return `I couldn't find the destination "${input.destination}". Please try a different address or place name.`;
    }

    const originCoords = await geocodeAddress(origin);
    if (!originCoords) {
      return `I couldn't find the origin "${origin}". Please try a different address or place name.`;
    }

    // Calculate straight-line distance using Haversine formula
    const distance = calculateHaversineDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);

    // Create directions URL
    const directionsUrl = makeDirectionsURL(origin, input.destination, mode);

    // Format response
    let response = `## Distance to ${input.destination}\n\n`;
    response += `From: ${input.origin || "Home Address"}\n`;
    response += `To: ${input.destination}\n`;
    response += `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}\n\n`;

    // Add straight-line distance
    response += `Straight-line distance: ${distance.toFixed(1)} km (${(distance * 0.621371).toFixed(1)} miles)\n\n`;

    response += `[Open Directions in Google Maps](${directionsUrl})\n\n`;

    response +=
      "You can view turn-by-turn directions, traffic information, and estimated travel time by opening the link in Google Maps.";

    return response;
  } catch (error) {
    showFailureToast(error, { title: "Error Calculating Distance" });
    return `Sorry, I encountered an error while calculating the distance to "${input.destination}". Please check your API key and try again.`;
  }
}

// Export as default for Raycast tool compatibility
export default getDistance;
