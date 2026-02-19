import { ActionPanel, List, Action, showToast, Toast, Keyboard } from "@raycast/api";
import { AvailableDevice, Device } from "./lib/types";
import {
  getDeviceIcon,
  getDevices,
  getOnStateText,
  isAvailableDevice,
  locateDevicesOnLocalNetwork,
  queryDevicesOnLocalNetwork,
  turnDeviceOn,
  turnDeviceOff,
} from "./lib/devices";
import { split } from "./lib/utils";
import { usePromise } from "@raycast/utils";

const fetchDevices = async () => {
  let devices;
  try {
    devices = await getDevices();
  } catch (error) {
    showToast({ title: (error as Error).toString(), style: Toast.Style.Failure });
    return [];
  }

  const locatedDevices = await locateDevicesOnLocalNetwork(devices);
  const augmentedLocatedDevices = await queryDevicesOnLocalNetwork(locatedDevices);

  return augmentedLocatedDevices;
};

export default function Command() {
  const { data: devices, isLoading, revalidate } = usePromise(fetchDevices, []);

  const [availableDevices, unavailableDevices] = split(devices || [], isAvailableDevice);

  const revalidateFn = () => {
    if (!isLoading) revalidate();
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Available">
        {availableDevices.map((device) => (
          <AvailableDeviceListItem
            device={device}
            key={device.deviceId}
            revalidate={revalidateFn}
            isLoading={isLoading}
          />
        ))}
      </List.Section>
      <List.Section title="Unavailable">
        {unavailableDevices.map((device) => (
          <UnavailableDeviceListItem device={device} key={device.deviceId} revalidate={revalidateFn} />
        ))}
      </List.Section>
      <List.EmptyView
        title="No devices found"
        description="Check your devices if they are plugged and connected to Wi-Fi"
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={revalidateFn} />
          </ActionPanel>
        }
      />
    </List>
  );
}

type AvailableDeviceProps = {
  device: AvailableDevice;
  isLoading: boolean;
  revalidate: () => void;
};

const AvailableDeviceListItem = (props: AvailableDeviceProps) => {
  const { device, revalidate, isLoading } = props;

  return (
    <List.Item
      title={device.alias}
      subtitle={device.name}
      key={device.deviceId}
      icon={getDeviceIcon(device)}
      accessories={[{ text: getOnStateText(device) || "" }]}
      actions={
        <ActionPanel>
          {device.isTurnedOn ? (
            <Action
              title="Turn off"
              onAction={() => {
                if (!isLoading) turnDeviceOff(device).then(revalidate);
              }}
            />
          ) : (
            <Action
              title="Turn on"
              onAction={() => {
                if (!isLoading) turnDeviceOn(device).then(revalidate);
              }}
            />
          )}
          <Action title="Refresh" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
};

const UnavailableDeviceListItem = (props: { device: Device; revalidate: () => void }) => {
  const { device, revalidate } = props;

  return (
    <List.Item
      title={device.alias}
      subtitle={device.name}
      key={device.deviceId}
      icon={getDeviceIcon(device)}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
};
