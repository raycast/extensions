import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { AudioDevice, getDefaultOutputDevice, getOutputDevices, setDefaultOutputDevice } from "./audio-device";

const getName = (devices: AudioDevice[], deviceId: string): string => {
  return devices.filter((device) => String(device.id) === String(deviceId))[0].name;
};

export default async () => {
  const { favourite, favourite2 } = getPreferenceValues();
  const current = await getDefaultOutputDevice();
  const devices = await getOutputDevices();

  if (favourite != null && favourite !== "") {
    try {
      // Switch to favorite2 if already in favourite
      if (favourite2 != null && favourite2 !== "" && String(current.id) === String(favourite)) {
        await setDefaultOutputDevice(favourite2);
        await showHUD(`Active output audio device set to ${getName(devices, favourite2)}`);
      }
      // Otherwise set to favourite
      else {
        await setDefaultOutputDevice(favourite);
        await showHUD(`Active output audio device set to ${getName(devices, favourite)}`);
      }
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
