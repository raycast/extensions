/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPreferenceValues } from "@raycast/api";
import { Seam } from "seam";

export enum DeviceStatus {
  HEAT = "Heating",
  COOL = "Cooling",
  OFF = "Off",
}

export type Device = [string, string, DeviceStatus, number]; // [device_id, display_name, status, temperature_fahrenheit]
type FetchDevicesResponse = [Device[], string];

const SEAM_API_KEY_LENGTH = 38; // Expected length of Seam API keys
const SEAM_API_KEY_PREFIX = "seam_"; // Required prefix for Seam API keys

export const isValidSeamApiKey = (key: string = "") =>
  !!key && key.length === SEAM_API_KEY_LENGTH && key.startsWith(SEAM_API_KEY_PREFIX);

export async function loadSeam(): Promise<[Seam, ""] | [null, string]> {
  const { seam_apikey } = getPreferenceValues();
  if (!isValidSeamApiKey(seam_apikey)) {
    return [null, `Invalid API Key. Please set a valid Seam API key in your Raycast settings.`];
  }
  const seam = new Seam({ apiKey: seam_apikey });
  return [seam, ""];
}

export async function fetchDevices(seam: Seam): Promise<FetchDevicesResponse> {
  try {
    console.debug("Attempting device list");
    const devicesList = await seam.devices.list();

    return [
      devicesList.map((d) => {
        return [
          d.device_id,
          d.display_name,
          d.properties.is_heating ? DeviceStatus.HEAT : d.properties.is_cooling ? DeviceStatus.COOL : DeviceStatus.OFF,
          d.properties.temperature_fahrenheit || 0,
        ];
      }),
      "",
    ];
  } catch (error: any) {
    console.error("Error fetching devices:", error);

    if (error.response?.status === 429) {
      return [[], "Rate limit exceeded. Please wait a moment before trying again."];
    } else {
      return [[], error.message || "Failed to fetch devices"];
    }
  }
}
