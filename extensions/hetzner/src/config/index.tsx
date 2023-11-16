import { getPreferenceValues } from "@raycast/api";

interface Config {
  projectId: string;
  accessToken: string;
  apiURL: string;
  consoleURL: string;
}

export function getConfig(): Config {
  return {
    ...getPreferenceValues(),
    apiURL: "https://api.hetzner.cloud",
    consoleURL: "https://console.hetzner.cloud",
  };
}
