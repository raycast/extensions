import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  projectId: string;
  accessToken: string;
}

interface Config extends Preferences {
  apiURL: string;
  consoleURL: string;
}

export function getConfig(): Config {
  return {
    ...getPreferenceValues<Preferences>(),
    apiURL: "https://api.hetzner.cloud",
    consoleURL: "https://console.hetzner.cloud",
  };
}
