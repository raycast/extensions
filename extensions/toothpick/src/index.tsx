import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getBluetoothDevices, openBluetoothPreferences, toggleBluetoothDevice } from "./utils";

export default function Index() {
  const [deviceNames, setDeviceNames] = useState<string[]>([]);
  const [deviceStatuses, setDeviceStatuses] = useState<boolean[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchDevices() {
      const { deviceNames, deviceStatuses } = await getBluetoothDevices();
      setDeviceNames(deviceNames);
      setDeviceStatuses(deviceStatuses);
      setIsLoading(false);
    }

    fetchDevices();
  }, []);

  const toggleBluetooth = async (deviceName: string, deviceIdx: number) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: deviceStatuses[deviceIdx] ? "Disconnecting" : "Connecting",
    });
    const status = await toggleBluetoothDevice(deviceName);
    if (status) {
      const newDeviceStatuses = [...deviceStatuses];
      newDeviceStatuses[deviceIdx] = !newDeviceStatuses[deviceIdx];
      setDeviceStatuses(newDeviceStatuses);
      toast.style = Toast.Style.Success;
      toast.title = newDeviceStatuses[deviceIdx] ? "Connected to device!" : "Disconnected from device!";
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = deviceStatuses[deviceIdx] ? "Failed to disconnect!" : "Failed to connect!";
    }
  };

  return (
    <List
      enableFiltering={true}
      isLoading={isLoading}
      searchBarPlaceholder="Search devices"
    >
      <List.Section title="Devices">
        {deviceNames.map((deviceName, i) => (
          <List.Item
            key={deviceName}
            title={deviceName}
            icon={{ source: deviceStatuses[i] ? "on.png" : "off.png" }}
            actions={
              <ActionPanel>
                <Action
                  title={deviceStatuses[i] ? "Disconnect" : "Connect"}
                  icon={Icon.Link}
                  onAction={async () => await toggleBluetooth(deviceName, i)}
                />
                <Action title="Open Bluetooth Preferences" icon={Icon.Gear} onAction={openBluetoothPreferences} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
