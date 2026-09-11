import { Action, ActionPanel, Color, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getDevicesService } from "./core/devices/devices.service";
import { Device } from "./core/devices/devices.model";
import { showErrorMessage } from "./utils";

export default function ManageBluetoothConnectionsView() {
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);

  const { bluetoothBackend } = getPreferenceValues<ExtensionPreferences>();

  const { devicesService, error } = useMemo(() => {
    try {
      return { devicesService: getDevicesService(bluetoothBackend) };
    } catch {
      const error = "Could not find 'blueutil'!";
      showErrorMessage(error);
      return { error };
    }
  }, [bluetoothBackend]);

  useEffect(() => {
    if (!devicesService) return;
    setDevices(devicesService.getDevices());
    setLoading(false);
    const interval = setInterval(() => setDevices(devicesService.getDevices()), 300);
    return () => clearInterval(interval);
  }, [devicesService]);

  return (
    <List isLoading={loading && !error}>
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title={error}
          description="Please install via brew or enter the directory in Preferences"
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        devices.map((device) => (
          <List.Item
            icon={device.icon}
            title={device.name ? device.name : device.macAddress}
            key={device.macAddress}
            accessories={device.accessories}
            subtitle={device.type}
            actions={
              <ActionPanel title={`Actions for ${device.name ? device.name : device.macAddress}`}>
                <>{device.actions}</>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
