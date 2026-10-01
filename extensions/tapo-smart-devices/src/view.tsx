import { ActionPanel, List, Action, showToast, Toast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AvailableDevice, Device } from "./lib/types";
import {
  clearSavedDevices,
  getDeviceIcon,
  getDevices,
  getOnStateText,
  isAvailableDevice,
  locateDevicesOnLocalNetwork,
  queryDevicesOnLocalNetwork,
  saveDevices,
  turnDeviceOn,
  turnDeviceOff,
} from "./lib/devices";
import { split } from "./lib/utils";

const SCAN_DELAY_MS = 500;

const fetchDevices = async () => {
  try {
    const cachedDevices = await getDevices(true);
    const queryingDevices = queryDevicesOnLocalNetwork(cachedDevices);

    // Scan the network early rather than waiting for unreachable cached IPs to time out.
    let timer: NodeJS.Timeout | undefined;
    const allAnsweredInTime = await Promise.race([
      queryingDevices.then((devices) => devices.every(isAvailableDevice)),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), SCAN_DELAY_MS);
      }),
    ]);
    clearTimeout(timer);

    const augmentedLocatedDevices = allAnsweredInTime
      ? await queryingDevices
      : await Promise.all(
          (await locateDevicesOnLocalNetwork(cachedDevices)).map(async (locatedDevice, index) => {
            // Query a moved device at its new IP instead of waiting for the old one to time out.
            const hasMoved = locatedDevice.ip !== undefined && locatedDevice.ip !== cachedDevices[index].ip;
            const [device] = hasMoved
              ? await queryDevicesOnLocalNetwork([locatedDevice])
              : [(await queryingDevices)[index]];

            // Forget the cached IP of a device that is no longer on the network.
            return isAvailableDevice(device) || locatedDevice.ip ? device : locatedDevice;
          }),
        );
    saveDevices(augmentedLocatedDevices);
    return augmentedLocatedDevices;
  } catch (error) {
    showToast({ title: (error as Error).toString(), style: Toast.Style.Failure });
    throw error;
  }
};

export default function Command() {
  const {
    data: devices,
    isLoading,
    revalidate,
    mutate,
  } = useCachedPromise(fetchDevices, [], { keepPreviousData: true });

  const [availableDevices, unavailableDevices] = split(devices || [], isAvailableDevice);

  // Fetches the device list from the cloud again and rescans the network.
  const refresh = () => {
    clearSavedDevices();
    revalidate();
  };

  const toggleDevice = (device: AvailableDevice) =>
    mutate(device.isTurnedOn ? turnDeviceOff(device) : turnDeviceOn(device), {
      optimisticUpdate: (data) =>
        data?.map((d) => (d.deviceId === device.deviceId ? { ...d, isTurnedOn: !device.isTurnedOn } : d)),
      // Supersede an in-flight refresh, whose result may predate this toggle.
      shouldRevalidateAfter: isLoading,
    }).catch(() => {
      // The failure toast is shown by turnDeviceOn/turnDeviceOff, and the optimistic update is rolled back.
    });

  return (
    <List isLoading={isLoading}>
      <List.Section title="Available">
        {availableDevices.map((device) => (
          <AvailableDeviceListItem device={device} key={device.deviceId} revalidate={refresh} onToggle={toggleDevice} />
        ))}
      </List.Section>
      <List.Section title="Unavailable">
        {unavailableDevices.map((device) => (
          <UnavailableDeviceListItem device={device} key={device.deviceId} revalidate={refresh} />
        ))}
      </List.Section>
      <List.EmptyView
        title="No devices found"
        description="Check your devices if they are plugged and connected to Wi-Fi"
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={refresh} />
          </ActionPanel>
        }
      />
    </List>
  );
}

type AvailableDeviceProps = {
  device: AvailableDevice;
  revalidate: () => void;
  onToggle: (device: AvailableDevice) => void;
};

const AvailableDeviceListItem = (props: AvailableDeviceProps) => {
  const { device, revalidate, onToggle } = props;

  return (
    <List.Item
      title={device.alias}
      subtitle={device.name}
      key={device.deviceId}
      icon={getDeviceIcon(device)}
      accessories={[{ text: getOnStateText(device) || "" }]}
      actions={
        <ActionPanel>
          <Action title={device.isTurnedOn ? "Turn off" : "Turn on"} onAction={() => onToggle(device)} />
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
