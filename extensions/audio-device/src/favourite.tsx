import { getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { setOutputDevice } from "./utils";

const preferences = getPreferenceValues();
if (preferences.favourite != null && preferences.favourite !== "") {
  setOutputDevice(preferences.favourite).then(() => {
    popToRoot();
    showToast({
      style: Toast.Style.Success,
      title: `Switched to ${preferences.favourite}`,
    });
  });
} else {
  showToast({
    style: Toast.Style.Failure,
    title: "No favorite device specified",
  });
  popToRoot();
}
