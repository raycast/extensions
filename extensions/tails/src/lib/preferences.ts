import { getPreferenceValues } from "@raycast/api";

export function getPreferences() {
  const prefs = getPreferenceValues<Preferences>();

  return {
    apiToken: prefs.apiToken,
    instanceUrl: (prefs.instanceUrl || "https://tails.surf").replace(/\/+$/, ""),
    downloadDirectory: prefs.downloadDirectory || "~/Downloads",
  };
}
