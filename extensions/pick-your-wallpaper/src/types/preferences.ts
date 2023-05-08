import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  wallpaperFolder: string;
  showTitle: boolean;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  console.log(preferences);
}
