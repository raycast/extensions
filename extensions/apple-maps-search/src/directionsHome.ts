import { getPreferenceValues, open } from "@raycast/api";
import { Preferences, makePlatformDirectionsURL } from "./utils";

export default async () => {
  const preferences: Preferences = getPreferenceValues();
  const dirURL = makePlatformDirectionsURL("", preferences.homeAddress, preferences.preferredMode);
  await open(dirURL);
};
