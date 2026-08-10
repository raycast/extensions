import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { getOutputDevices } from "./audio-device";
import { setOutputAndSystemDevice } from "./device-actions";

export default async () => {
  const preferences = getPreferenceValues();
  if (preferences.favourite != null && preferences.favourite !== "") {
    try {
      const devices = await getOutputDevices();
      const device = devices.find((d) => d.name === preferences.favourite);
      if (!device) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Device "${preferences.favourite}" not found`,
        });
        return;
      }
      await setOutputAndSystemDevice(device.id);
      await showHUD(`Active output audio device set to ${preferences.favourite}`);
    } catch (error) {
      console.error(error);
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
