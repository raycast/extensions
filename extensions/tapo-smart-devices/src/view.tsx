import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { AvailableDevice, Device } from "./types";
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
  setIsLoadingFn: (isLoading: boolean) => void,
  shouldDisplayToast: boolean
): Promise<void> => {
  let loadingToast;

  if (shouldDisplayToast) {
    loadingToast = await showToast({ title: "Fetching devices...", style: Toast.Style.Animated });
  }

  let devices;

  try {
    devices = await getDevices();
  } catch (error) {
    showToast({ title: (error as Error).toString(), style: Toast.Style.Failure });
    setIsLoadingFn(false);
    return;
  }

  const locatedDevices = await locateDevicesOnLocalNetwork(devices);
  const augmentedLocatedDevices = await queryDevicesOnLocalNetwork(locatedDevices);
  setDevicesFn(augmentedLocatedDevices);

  if (loadingToast) {
    await loadingToast.hide();
  }

  const availableDevices = augmentedLocatedDevices.filter(isAvailableDevice);

  if (shouldDisplayToast) {
    await showToast({ title: `Found ${availableDevices.length} available devices`, style: Toast.Style.Success });
  }

  setIsLoadingFn(false);
};

const AvailableDeviceListItem = (props: {
  device: AvailableDevice;
  refreshFn: (shouldDisplayToast: boolean) => void;
}): JSX.Element => {
  const { device, refreshFn } = props;

  return (
    <List.Item
      title={device.alias}
      subtitle={device.name}
      key={device.id}
      icon={getDeviceIcon(device)}
      accessories={[{ text: getOnStateText(device) || "" }]}
      actions={
        <ActionPanel>
          {device.isTurnedOn ? (
            <Action title="Turn Off" onAction={() => turnDeviceOff(device).then(() => refreshFn(false))} />
          ) : (
            <Action title="Turn On" onAction={() => turnDeviceOn(device).then(() => refreshFn(false))} />
          )}
          <Action title="Refresh" onAction={() => refreshFn(true)} />
        </ActionPanel>
      }
    />
  );
};

const UnavailableDeviceListItem = (props: {
  device: Device;
  refreshFn: (shouldDisplayToast: boolean) => void;
}): JSX.Element => {
  const { device, refreshFn } = props;

  return (
    <List.Item
      title={device.alias}
      subtitle={device.name}
      key={device.id}
      icon={getDeviceIcon(device)}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={() => refreshFn(true)} />
        </ActionPanel>
      }
    />
  );
};

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    refreshDevices(setDevices, setIsLoading, true);
  }, []);

  const [availableDevices, unavailableDevices] = split(devices, isAvailableDevice);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Available">
        {availableDevices.map((device) => (
          <AvailableDeviceListItem
            device={device}
            key={device.id}
            refreshFn={(shouldDisplayToast) => {
              setIsLoading(true);
              refreshDevices(setDevices, setIsLoading, shouldDisplayToast);
            }}
          />
        ))}
      </List.Section>
      <List.Section title="Unavailable">
        {unavailableDevices.map((device) => (
          <UnavailableDeviceListItem
            device={device}
            key={device.id}
            refreshFn={(shouldDisplayToast) => {
              setIsLoading(true);
              refreshDevices(setDevices, setIsLoading, shouldDisplayToast);
            }}
          />
        ))}
      </List.Section>
    </List>
  );
}
