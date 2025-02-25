import { getPreferenceValues } from "@raycast/api";

const SIGNATURE = "Created with <a href='https://raycast.com'>Raycast</a>";

const preferences: Preferences.CreateEvent = getPreferenceValues();

export function roundUpTime(date = new Date(), roundMins = 15) {
  const ms = 1000 * 60 * roundMins;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

export function addSignature(description: string | undefined) {
  if (!preferences.addSignature) {
    return description;
  }

  if (!description) {
    return SIGNATURE;
  }

  return `${description}\n<hr>${SIGNATURE}`;
}
