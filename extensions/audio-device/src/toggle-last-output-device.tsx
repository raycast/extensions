import { getPreferenceValues, launchCommand, LaunchType, LocalStorage, showHUD, showToast, Toast } from "@raycast/api";
import { AudioDevice, getDefaultOutputDevice, setDefaultOutputDevice, setDefaultSystemDevice } from "./audio-device";

export default async () => {
  const { systemOutput } = getPreferenceValues();
  const current = await getDefaultOutputDevice();

  // Get last used device from localstorage and parse it
  const lastUsedDevice = JSON.parse((await LocalStorage.getItem("lastUsedDevice")) || "null") as AudioDevice | null;

  try {
    // and the name is not same
    if (lastUsedDevice && lastUsedDevice.id !== current.id) {
      // Store current device as last used
      await LocalStorage.setItem("lastUsedDevice", JSON.stringify(current));

      // Switch to last used device
      await setDefaultOutputDevice(lastUsedDevice.id);
      if (systemOutput) {
        await setDefaultSystemDevice(lastUsedDevice.id);
      }
      LocalStorage.setItem("lastUsedDevice", JSON.stringify(current));
      await showHUD(`Active output audio device set to ${lastUsedDevice.name}`);
    } else {
      // First time running, show device list
      launchCommand({
        name: "set-output-device",
        type: LaunchType.UserInitiated,
      });
      await showToast({
        style: Toast.Style.Failure,
        title: "No last used device found, select one first",
      });
    }
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to switch output audio device",
    });
  }
};
