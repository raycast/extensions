import axios from "axios";
import { getPreferenceValues } from "@raycast/api";
// Stellen Sie sicher, dass der Pfad korrekt ist
import type { Device as ImportedDevice, DeviceStatus } from "./types.ts";

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

async function fetchDeviceStatuses(deviceIds: string[]): Promise<{
  [key: string]: { components: { main: DeviceStatus }; roomName: string };
}> {
  const promises = deviceIds.map((id) => api.get(`/devices/${id}/status`));
  const responses = await Promise.all(promises);
  return responses.reduce(
    (
      acc: {
        [key: string]: { components: { main: DeviceStatus }; roomName: string };
      },
      res,
      index,
    ) => {
      acc[deviceIds[index]] = res.data;
      return acc;
    },
    {},
  );
}

interface Device extends ImportedDevice {
  deviceId: string;
  deviceTypeName: string;
  // andere Eigenschaften...
}

export async function fetchDevices(): Promise<Device[]> {
  const devices = await fetchAllDeviceDetails();
  const deviceIds = devices.map((device: Device) => device.deviceId);
  const statuses = await fetchDeviceStatuses(deviceIds);

  return devices.map((device: Device) => ({
    ...device,
    status: statuses[device.deviceId].components.main,
    roomName: statuses[device.deviceId].roomName,
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to switch location mode: ${error.message}`);
    } else {
      throw new Error("Failed to switch location mode: Unknown error");
    }
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

export async function fetchDevicesInRoom(roomId: string) {
  try {
    const response = await api.get(`/devices`, {
      params: { roomId },
    });
    return response.data.items;
  } catch (error) {
    console.error("Fehler beim Abrufen der Geräte:", (error as Error).message);
    throw error;
  }
}
