import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { setOutputDevice } from "./utils";

export default async () => {
  const preferences = getPreferenceValues();
  if (preferences.favourite != null && preferences.favourite !== "") {
    try {
      await setOutputDevice(preferences.favourite);
      await showHUD(`Active output audio device set to ${preferences.favourite}`);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Favourite output audio device could not be set",
      });
    }
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "No favourite output audio device specified",
    });
  }
};
