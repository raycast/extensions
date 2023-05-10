import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import {
  AudioDevice,
  getDefaultOutputDevice,
  getOutputDevices,
  setDefaultOutputDevice,
  setDefaultSystemDevice,
} from "./audio-device";

const getId = (devices: AudioDevice[], deviceName: string): string => {
  return devices.filter((device) => String(device.name) === String(deviceName))[0].id;
};

export default async () => {
  const { favourite, favourite2, systemoutput } = getPreferenceValues();
  const current = await getDefaultOutputDevice();
  const devices = await getOutputDevices();

  if (favourite != null && favourite !== "") {
    try {
      // Switch to favorite2 if already in favourite
      if (favourite2 != null && favourite2 !== "" && String(current.name) === String(favourite)) {
        const deviceId = getId(devices, favourite2);
        await setDefaultOutputDevice(deviceId);
        if (systemoutput) {
          await setDefaultSystemDevice(deviceId);
        }
        await showHUD(`Active output audio device set to ${favourite2}`);
      }
      // Otherwise set to favourite
      else {
        const deviceId = getId(devices, favourite);
        await setDefaultOutputDevice(deviceId);
        if (systemoutput) {
          await setDefaultSystemDevice(deviceId);
        }
        await showHUD(`Active output audio device set to ${favourite}`);
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
