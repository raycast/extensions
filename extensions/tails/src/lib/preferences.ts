import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  apiToken: string;
  instanceUrl: string;
  downloadDirectory: string;
}

export function getPreferences(): Preferences {
  const prefs = getPreferenceValues<Preferences>();

  return {
    apiToken: prefs.apiToken,
    instanceUrl: (prefs.instanceUrl || "https://tails.surf").replace(
      /\/+$/,
      "",
    ),
    downloadDirectory: prefs.downloadDirectory || "~/Downloads",
  };
}
