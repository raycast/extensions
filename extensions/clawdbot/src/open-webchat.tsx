import { open, getPreferenceValues } from "@raycast/api";

interface Preferences {
  webchatUrl: string;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const url = preferences.webchatUrl || "http://localhost:3033";
  await open(url);
}
