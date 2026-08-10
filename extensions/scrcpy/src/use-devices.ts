import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import useAdbDevices from "./use-adb-devices";
import type { DeviceOption } from "./types";

const DEFAULT_DEVICE_STORAGE_KEY = "defaultDevice";

export default function useDevices(): readonly [readonly DeviceOption[], (device: DeviceOption) => Promise<void>] {
  const devices = useAdbDevices();
  const [defaultDevice, handleDeviceChange] = useDefaultDevice();

  if (devices.length === 0 || !defaultDevice) {
    return [[] as DeviceOption[], handleDeviceChange] as const;
  }

  // Manipulate Form.Dropdown with `value` and `onChange` is buggy
  // To select previous used device, we move it to the top of the devices, so
  // that Form.Dropdown will automatically choose it for us.
  const foundDefaultDevice = devices.find((device) => device.serial === defaultDevice.serial);
  if (foundDefaultDevice) {
    return [
      [defaultDevice, ...devices.filter((device) => device.serial !== defaultDevice.serial)],
      handleDeviceChange,
    ] as const;
  }
  return [devices, handleDeviceChange];
}

function useDefaultDevice() {
  const [defaultDevice, setDefaultDevice] = useState<DeviceOption>();

  useEffect(() => {
    LocalStorage.getItem<string>(DEFAULT_DEVICE_STORAGE_KEY).then((deviceserial) => {
      setDefaultDevice({
        serial: deviceserial ?? "",
        default: true,
      });
    });
  }, []);

  const handleDeviceChange = (device: DeviceOption) => {
    setDefaultDevice({
      serial: device.serial,
      default: true,
    });
    return LocalStorage.setItem(DEFAULT_DEVICE_STORAGE_KEY, device.serial);
  };

  return [defaultDevice, handleDeviceChange] as const;
}
