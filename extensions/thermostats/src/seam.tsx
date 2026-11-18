import { getPreferenceValues } from "@raycast/api";
import { Seam } from "seam";

export enum DeviceStatus {
  HEAT = "Heating",
  COOL = "Cooling",
  OFF = "Off",
}

export type Device = {
  id: string;
  name: string;
  status: DeviceStatus;
  temperatureFahrenheit: number;
};
type FetchDevicesResponse = [Device[], string];

const SEAM_API_KEY_LENGTH = 38; // Expected length of Seam API keys
const SEAM_API_KEY_PREFIX = "seam_"; // Required prefix for Seam API keys

export const isValidSeamApiKey = (key: string = "") =>
  !!key && key.length === SEAM_API_KEY_LENGTH && key.startsWith(SEAM_API_KEY_PREFIX);

function getErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } }).response?.status;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to fetch devices";
}

export async function loadSeam(): Promise<[Seam, ""] | [null, string]> {
  const { seam_apikey } = getPreferenceValues<Preferences>();
  if (!isValidSeamApiKey(seam_apikey)) {
    return [null, `Invalid API Key. Please set a valid Seam API key in your Raycast settings.`];
  }
  const seam = new Seam({ apiKey: seam_apikey });
  return [seam, ""];
}

export async function fetchDevices(seam: Seam): Promise<FetchDevicesResponse> {
  try {
    const devicesList = await seam.thermostats.list();

    return [
      devicesList.map((d) => {
        return {
          id: d.device_id,
          name: d.display_name,
          status: d.properties.is_heating
            ? DeviceStatus.HEAT
            : d.properties.is_cooling
              ? DeviceStatus.COOL
              : DeviceStatus.OFF,
          temperatureFahrenheit: d.properties.temperature_fahrenheit || 0,
        };
      }),
      "",
    ];
  } catch (error: unknown) {
    if (getErrorStatus(error) === 429) {
      return [[], "Rate limit exceeded. Please wait a moment before trying again."];
    }

    return [[], getErrorMessage(error)];
  }
}
