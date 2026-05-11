import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

const SMARTTHINGS_API_URL = "https://api.smartthings.com/v1";
const preferences = getPreferenceValues();
const SMARTTHINGS_API_TOKEN = preferences.apiToken; // Retrieve the API token from preferences
const SMARTTHINGS_LOCATION_ID = preferences.locationId; // Retrieve the location ID from preferences

export async function fetchRooms() {
  try {
    const response = await axios.get(
      `${SMARTTHINGS_API_URL}/locations/${SMARTTHINGS_LOCATION_ID}/rooms`,
      {
        headers: {
          Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
        },
      },
    );
    console.log("Rooms payload:", response.data);
    return response.data.items;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Failed to fetch rooms:", error.message);
    } else {
      console.error("Failed to fetch rooms:", error);
    }
    throw error;
  }
}

export async function fetchDevicesInRoom(roomId: any) {
  // Typ 'any' explizit angeben
  try {
    const response = await axios.get(`${SMARTTHINGS_API_URL}/devices`, {
      headers: {
        Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
      },
    });
    const devices = response.data.items.filter(
      (device: any) => device.roomId === roomId,
    ); // Typ 'any' explizit angeben
    return devices;
  } catch (error) {
    console.error("Failed to fetch devices:", (error as Error).message); // Typ 'Error' explizit angeben
    throw error;
  }
}
