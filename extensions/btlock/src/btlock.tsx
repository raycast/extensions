import { Action, ActionPanel, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { BluetoothDevice } from "./types";
import { getBluetoothDevices } from "./bluetooth";
import { SERIAL_NUMBER_KEY } from "./constants";

export default function Command() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDevices = async () => {
    try {
      const discoveredDevices = await getBluetoothDevices();
      setDevices(discoveredDevices);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to discover Bluetooth devices",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();

    const interval = setInterval(() => {
      loadDevices();
    }, 5000); // Reduced from 500ms to 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <List isLoading={isLoading}>
      {devices.length === 0 && !isLoading ? (
        <List.EmptyView title="No Bluetooth devices found" />
      ) : (
        devices.map((device, index) => (
          <List.Item
            key={index}
            title={device.name}
            subtitle={device.connected ? device.rssi.toString() + "dB" : undefined}
            actions={
              <ActionPanel>
                <ActionPanel.Submenu title="Open Actions">
                  {device.connected ? (
                    <Action
                      title={device.isSavedInLocalStorage ? "Remove Watcher for Lock" : "Set Watcher for Lock"}
                      onAction={async () => {
                        await LocalStorage.setItem(
                          SERIAL_NUMBER_KEY,
                          device.isSavedInLocalStorage ? "" : device.serialNumber,
                        );
                        await loadDevices();
                        showToast({
                          style: Toast.Style.Success,
                          title: device.isSavedInLocalStorage ? "Watcher removed" : "Watcher added",
                        });
                      }}
                    />
                  ) : null}
                  <ActionPanel.Section>
                    <Action title="Settings" />
                  </ActionPanel.Section>
                </ActionPanel.Submenu>
              </ActionPanel>
            }
            accessories={[{ text: device.connected ? "Connected" : "Paired" }]}
          />
        ))
      )}
    </List>
  );
}
