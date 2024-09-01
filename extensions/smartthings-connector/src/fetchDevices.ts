import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();
const SMARTTHINGS_API_URL = "https://api.smartthings.com/v1";
const SMARTTHINGS_API_TOKEN = preferences.apiToken;
const SMARTTHINGS_LOCATION_ID = preferences.locationId;

const api = axios.create({
  baseURL: SMARTTHINGS_API_URL,
  headers: {
    Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
    "Content-Type": "application/json",
  },
});

async function fetchAllDeviceDetails() {
  const response = await api.get("/devices");
  return response.data.items;
}

async function fetchDeviceStatuses(deviceIds: string[]) {
  const promises = deviceIds.map((id) => api.get(`/devices/${id}/status`));
  const responses = await Promise.all(promises);
  return responses.reduce((acc: { [key: string]: any }, res, index) => {
    // Typ für 'acc' explizit angeben
    acc[deviceIds[index]] = res.data as any; // Typ 'any' explizit angeben
    return acc;
  }, {});
}

export async function fetchDevices() {
  const devices = await fetchAllDeviceDetails();
  const deviceIds = devices.map((device: any) => device.deviceId); // Typ 'any' explizit angeben
  const statuses = await fetchDeviceStatuses(deviceIds);

  return devices.map((device: any) => ({
    ...device,
    status: (statuses[device.deviceId] as { components: { main: any } })
      .components.main, // Typ 'any' explizit angeben
    roomName: (statuses[device.deviceId] as { roomName: string }).roomName, // Typ 'string' explizit angeben
    deviceType: device.deviceTypeName,
  }));
}

export async function fetchLocationModes() {
  try {
    const response = await api.get(
      `/locations/${SMARTTHINGS_LOCATION_ID}/modes`,
    );
    return response.data.items;
  } catch (error) {
    throw new Error(
      `Failed to fetch location modes: ${(error as Error).message}`,
    ); // Typ 'Error' explizit angeben
  }
}

export async function fetchCurrentLocationMode() {
  try {
    const response = await api.get(
      `/locations/${SMARTTHINGS_LOCATION_ID}/modes/current`,
    );
    return response.data.mode;
  } catch (error) {
    throw new Error(
      `Failed to fetch current location mode: ${(error as Error).message}`,
    );
  }
}

export async function switchLocationMode(modeId: string) {
  try {
    await api.put(`/locations/${SMARTTHINGS_LOCATION_ID}/modes/current`, {
      modeId,
    });
  } catch (error: any) {
    // Typ 'any' explizit angeben
    throw new Error(`Failed to switch location mode: ${error.message}`);
  }
}

export async function fetchLocationId() {
  try {
    const response = await api.get("/locations");
    const locations = response.data.items;
    return locations.length > 0 ? locations[0].locationId : null;
  } catch (error: unknown) {
    // Typ 'unknown' explizit angeben
    if (error instanceof Error) {
      throw new Error(`Failed to fetch location ID: ${error.message}`);
    } else {
      throw new Error("Failed to fetch location ID: Unknown error");
    }
  }
}
