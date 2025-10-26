import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

const SMARTTHINGS_API_URL = "https://api.smartthings.com/v1/devices";

export async function toggleDevice(deviceId: string) {
  const preferences = getPreferenceValues();
  const SMARTTHINGS_API_TOKEN = preferences.apiToken;

  // Get current status
  const statusResponse = await axios.get(`${SMARTTHINGS_API_URL}/${deviceId}/status`, {
    headers: {
      Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
    },
  });
  const currentStatus = statusResponse.data.components.main.switch.switch.value;

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
        },
      },
    );
  } catch (error) {
    console.error(error);
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
        },
      },
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Convert hex to RGB first
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length == 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length == 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin;
  let h = 0,
    s = 0,
    l = 0;

  if (delta == 0) h = 0;
  else if (cmax == r) h = ((g - b) / delta) % 6;
  else if (cmax == g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
}

export async function setLightColor(deviceId: string, color: string) {
  const preferences = getPreferenceValues();
  const SMARTTHINGS_API_TOKEN = preferences.apiToken;

  const { h, s } = hexToHsl(color);
  const hue = h / 3.6;
  const saturation = s;

  try {
    await axios.post(
      `${SMARTTHINGS_API_URL}/${deviceId}/commands`,
      {
        commands: [
          {
            component: "main",
            capability: "colorControl",
            command: "setColor",
            arguments: [{ hue, saturation }],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
        },
      },
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function setTemperature(deviceId: string, temperature: number) {
  const preferences = getPreferenceValues();
  const SMARTTHINGS_API_TOKEN = preferences.apiToken;
  try {
    await axios.post(
      `${SMARTTHINGS_API_URL}/${deviceId}/commands`,
      {
        commands: [
          {
            component: "main",
            capability: "thermostatCoolingSetpoint",
            command: "setCoolingSetpoint",
            arguments: [temperature],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
        },
      },
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
}
