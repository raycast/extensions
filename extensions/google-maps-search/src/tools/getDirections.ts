import { getPreferenceValues } from "@raycast/api";
import { geocodeAddress } from "../utils/googlePlacesApi";
import { makeDirectionsURL } from "../utils/url";
import { Preferences } from "../types";
import { showFailureToast } from "@raycast/utils";

/**
 * Input type for the get-directions tool
 */
type GetDirectionsInput = {
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
  mode?: string;
};

/**
 * Tool for getting directions between locations
 */
export async function getDirections(input: GetDirectionsInput): Promise<string> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    let mode = input.mode || preferences.preferredMode || "driving";

    // Validate that mode is one of the allowed values
    const validModes = ["driving", "walking", "bicycling", "transit"];
    if (!validModes.includes(mode)) {
      console.warn(`Invalid transportation mode: ${mode}. Defaulting to driving.`);
      mode = "driving";
    }

    // Validate destination and origin by geocoding
    const destCoords = await geocodeAddress(input.destination);
    if (!destCoords) {
      return `I couldn't find the destination "${input.destination}". Please try a different address or place name.`;
    }

    if (input.origin) {
      const originCoords = await geocodeAddress(input.origin);
      if (!originCoords) {
        return `I couldn't find the origin "${input.origin}". Please try a different address or place name.`;
      }
    }

    // Create directions URL
    const directionsUrl = makeDirectionsURL(input.origin || "", input.destination, mode);

    // Format response
    let response = `## Directions to ${input.destination}\n\n`;

    if (input.origin) {
      response += `From: ${input.origin}\n`;
    } else {
      // If no origin was provided, we're using the home address from preferences
      response += `From: Home Address (${preferences.homeAddress || "Not set"})\n`;
    }
    response += `To: ${input.destination}\n`;
    response += `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}\n\n`;

    response += `[Open Directions in Google Maps](${directionsUrl})\n\n`;

    response +=
      "You can view turn-by-turn directions, traffic information, and estimated travel time by opening the link in Google Maps.";

    return response;
  } catch (error) {
    showFailureToast(error, { title: "Error Getting Directions", message: String(error) });
    return `Sorry, I encountered an error while getting directions to "${input.destination}". Please check your API key and try again.`;
  }
}

// Export as default for Raycast tool compatibility
export default getDirections;
