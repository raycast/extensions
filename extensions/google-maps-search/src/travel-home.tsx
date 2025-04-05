import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { Preferences } from "./types";
import { makeDirectionsURL } from "./utils/url";

export default async () => {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const dirURL = makeDirectionsURL("", preferences.homeAddress, preferences.preferredMode);
    await open(dirURL);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open directions",
      message: String(error),
    });
  }
};
