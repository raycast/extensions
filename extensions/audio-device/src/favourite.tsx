import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { setOutputDevice } from "./utils";

const preferences = getPreferenceValues();
if (preferences.favourite != null && preferences.favourite !== "") {
  setOutputDevice(preferences.favourite);
  showHUD(`Active output audio device set to ${preferences.favourite}`);
} else {
  showToast({
    style: Toast.Style.Failure,
    title: "No favourite output audio device specified",
  });
}
