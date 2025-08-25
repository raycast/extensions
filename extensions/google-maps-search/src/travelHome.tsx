import { getPreferenceValues, open } from "@raycast/api";
import { Preferences } from "./types";
import { makeDirectionsURL } from "./utils/url";
import { showFailureToast } from "@raycast/utils";

// Renamed to travelHome.tsx
export default async function travelHome() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const dirURL = makeDirectionsURL("", preferences.homeAddress, preferences.preferredMode);
    await open(dirURL);
  } catch (error) {
    await showFailureToast({
      title: "Failed to open directions",
      message: String(error),
    });
  }
}
