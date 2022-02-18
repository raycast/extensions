import { getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { setOutputDevice } from "./utils";

const preferences = getPreferenceValues();
setOutputDevice(preferences.favourite).then(() => {
  popToRoot();
  showToast({
    style: Toast.Style.Success,
    title: `Switched to ${preferences.favourite}`,
  });
});
