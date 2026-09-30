import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { AudioDevice, getDefaultOutputDevice, getOutputDevices } from "./audio-device";
import { setOutputAndSystemDevice } from "./device-actions";
import { findDeviceByName } from "./utils";

const getId = (devices: AudioDevice[], deviceName: string): string => {
  const device = findDeviceByName(devices, String(deviceName));
  if (!device) throw new Error(`Device "${deviceName}" not found`);
  return device.id;
};

export default async () => {
  const { favourite, favourite2 } = getPreferenceValues();
  const current = await getDefaultOutputDevice();
  const devices = await getOutputDevices();

  if (favourite != null && favourite !== "") {
    try {
      let selectedDeviceId;
      let selectedDeviceName;
      // Switch to favorite2 if already in favourite
      if (
        favourite2 != null &&
        favourite2 !== "" &&
        String(findDeviceByName(devices, String(favourite))?.id) === String(current.id)
      ) {
        selectedDeviceId = getId(devices, favourite2);
        selectedDeviceName = favourite2;
      }
      // Otherwise set to favourite
      else {
        selectedDeviceId = getId(devices, favourite);
        selectedDeviceName = favourite;
      }

      await setOutputAndSystemDevice(selectedDeviceId);
      await showHUD(`Active output audio device set to ${selectedDeviceName}`);
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
