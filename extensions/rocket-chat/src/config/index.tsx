import { getPreferenceValues } from "@raycast/api";

interface Config {
  baseUrl: string;
  userId: string;
  accessToken: string;
}

export function getConfig(): Config {
  return getPreferenceValues();
}
