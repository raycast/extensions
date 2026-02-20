import { getPreferenceValues } from "@raycast/api";

function getPrefs() {
  return getPreferenceValues<Preferences>();
}

export function getIPAddresses(): string {
  const raw = getPrefs().ipAddresses;
  if (!raw) return "";
  return raw
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean)
    .join(",");
}

export function defaultBrightness(): string {
  return getPrefs().defaultBrightness || "10";
}

export function defaultTemperature(): string {
  return getPrefs().defaultTemperature || "3000";
}

export function dayLightBrightness(): string {
  return getPrefs().dayLightBrightness || "5";
}

export function dayLightTemperature(): string {
  return getPrefs().dayLightTemperature || "5000";
}

export function nightLightBrightness(): string {
  return getPrefs().nightLightBrightness || "20";
}

export function nightLightTemperature(): string {
  return getPrefs().nightLightTemperature || "3000";
}

export function brightnessChangeAmount(): string {
  return getPrefs().brightnessChangeAmount || "5";
}

export function validateBrightness(value: string, label: string): string | null {
  const n = Number(value);
  if (isNaN(n) || n < 1 || n > 100) return `${label} must be between 1 and 100`;
  return null;
}

export function validateTemperature(value: string, label: string): string | null {
  const n = Number(value);
  if (isNaN(n) || n < 2900 || n > 7000) return `${label} must be between 2900 and 7000`;
  return null;
}
