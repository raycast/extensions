import { getPreferenceValues } from "@raycast/api";

export const BASE_URL = "https://read.readwise.io/";

interface Preferences {
  token: string;
  openInDesktopApp: boolean;
}

export function getOpenUrl(path: string): string {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.openInDesktopApp) {
    return `wiseread://${path}`;
  }

  return BASE_URL + path;
}
