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
  const { favourite, favourite2, systemOutput } = getPreferenceValues();
  const current = await getDefaultOutputDevice();
  const devices = await getOutputDevices();

  if (favourite != null && favourite !== "") {
    try {
      let selectedDeviceId;
      let selectedDeviceName;
      // Switch to favorite2 if already in favourite
      if (favourite2 != null && favourite2 !== "" && String(current.name) === String(favourite)) {
        selectedDeviceId = getId(devices, favourite2);
        selectedDeviceName = favourite2;
      }
      // Otherwise set to favourite
      else {
        selectedDeviceId = getId(devices, favourite);
        selectedDeviceName = favourite;
      }

      await setDefaultOutputDevice(selectedDeviceId);
      if (systemOutput) {
        await setDefaultSystemDevice(selectedDeviceId);
      }
      await showHUD(`Active output audio device set to ${selectedDeviceName}`);
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
