// fetchLocationModes.ts
import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

const SMARTTHINGS_API_URL = "https://api.smartthings.com/v1";
const preferences = getPreferenceValues();
const SMARTTHINGS_API_TOKEN = preferences.apiToken; // Retrieve the API token from preferences
const SMARTTHINGS_LOCATION_ID = preferences.locationId; // Retrieve the location ID from preferences

export async function fetchLocationModes() {
  try {
    const url = `${SMARTTHINGS_API_URL}/locations/${SMARTTHINGS_LOCATION_ID}/modes`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
      },
    });

    console.log("API Response:", response.data); // Log the response data

    return response.data.items; // Assuming API response has 'items' array containing modes
  } catch (error: any) {
    // Specify the type of error as 'any'
    throw new Error(`Failed to fetch location modes: ${error.message}`);
  }
}
