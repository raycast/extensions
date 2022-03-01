import { getPreferenceValues, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { setOutputDevice } from "./utils";

const preferences = getPreferenceValues();
if (preferences.favourite != null && preferences.favourite !== "") {
  setOutputDevice(preferences.favourite);
  popToRoot();
  showHUD(`Active audio device set to ${preferences.favourite}`);
} else {
  showToast({
    style: Toast.Style.Failure,
    title: "No favorite device specified",
  });
  popToRoot();
}
