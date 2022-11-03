import { Icon, MenuBarExtra } from "@raycast/api";
import { useEffect, useState } from "react";

import { Device } from "./types";
import {
  getDeviceIcon,
  getDevices,
  getOnStateText,
  isAvailableDevice,
  locateDevicesOnLocalNetwork,
  queryDevicesOnLocalNetwork,
  turnDeviceOn,
  turnDeviceOff,
} from "./devices";
import { split } from "./utils";

const refreshDevices = async (
  setDevicesFn: (devices: Device[]) => void,
  setIsLoadingFn: (isLoading: boolean) => void
): Promise<void> => {
  let devices;

  try {
    devices = await getDevices();
  } catch (error) {
    setIsLoadingFn(false);
    return;
  }

  const locatedDevices = await locateDevicesOnLocalNetwork(devices);
  const augmentedLocatedDevices = await queryDevicesOnLocalNetwork(locatedDevices);
  setDevicesFn(augmentedLocatedDevices);

  setIsLoadingFn(false);
};

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    refreshDevices(setDevices, setIsLoading);
  }, []);

  const [availableDevices, unavailableDevices] = split(devices, isAvailableDevice);

  return (
    <MenuBarExtra icon={Icon.LightBulb} tooltip="Tapo Smart Devices" isLoading={isLoading}>
      {isLoading && <MenuBarExtra.Item title="Loading ⏳" />}
      {availableDevices.length && <MenuBarExtra.Item title="Available" />}
      {availableDevices.map((device) => (
        <MenuBarExtra.Item
          title={`${device.alias} (${getOnStateText(device)})`}
          key={device.id}
          icon={getDeviceIcon(device)}
          tooltip={device.name}
          onAction={async () => {
            if (device.isTurnedOn) {
              await turnDeviceOff(device);
            } else {
              await turnDeviceOn(device);
            }
          }}
        />
      ))}
      {unavailableDevices.length && <MenuBarExtra.Item title="Unavailable" />}
      {unavailableDevices.map((device) => (
        <MenuBarExtra.Item title={device.alias} key={device.id} icon={getDeviceIcon(device)} tooltip={device.name} />
      ))}
    </MenuBarExtra>
  );
}
