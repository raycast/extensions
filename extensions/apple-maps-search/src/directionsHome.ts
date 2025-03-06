import open from "open";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, makeDirectionsURL } from "./utils";

export default async () => {
  const preferences: Preferences = getPreferenceValues();
  const dirURL = makeDirectionsURL("", preferences.homeAddress, preferences.preferredMode);
  open(dirURL);
};
