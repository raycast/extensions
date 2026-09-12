import { getPreferenceValues, open } from "@raycast/api";
import { Preferences } from "./utils/types";
import { makeDirectionsURL } from "./utils/url";

export default async () => {
  const preferences = getPreferenceValues<Preferences>();
  const dirURL = makeDirectionsURL("", preferences.homeAddress, preferences.preferredMode);
  await open(dirURL);
};
