import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

const SMARTTHINGS_API_URL = "https://api.smartthings.com/v1/devices";

export async function toggleLight(deviceId: string, currentStatus: string) {
  const preferences = getPreferenceValues();
  const SMARTTHINGS_API_TOKEN = preferences.apiToken;

  const newStatus = currentStatus === "on" ? "off" : "on";

  try {
    await axios.post(
      `${SMARTTHINGS_API_URL}/${deviceId}/commands`,
      {
        commands: [
          {
            component: "main",
            capability: "switch",
            command: newStatus,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return newStatus;
  } catch (error) {
    console.error("Failed to toggle light:", (error as Error).message);
    throw error;
  }
}

export async function setLightLevel(deviceId: string, level: number) {
  const preferences = getPreferenceValues();
  const SMARTTHINGS_API_TOKEN = preferences.apiToken;

  try {
    await axios.post(
      `${SMARTTHINGS_API_URL}/${deviceId}/commands`,
      {
        commands: [
          {
            component: "main",
            capability: "switchLevel",
            command: "setLevel",
            arguments: [level],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to set light level:", (error as Error).message);
    throw error;
  }
}
