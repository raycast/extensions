import { Action, ActionPanel, Color, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getDevicesService } from "./core/devices/devices.service";
import { Device } from "./core/devices/devices.model";

export default function ManageBluetoothConnectionsView() {
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [refreshError, setRefreshError] = useState<string>();

  const { bluetoothBackend } = getPreferenceValues<ExtensionPreferences>();

  const { devicesService, serviceError } = useMemo(() => {
    try {
      return { devicesService: getDevicesService(bluetoothBackend) };
    } catch (error) {
      return { serviceError: error instanceof Error ? error.message : String(error) };
    }
  }, [bluetoothBackend]);

  useEffect(() => {
    if (!devicesService) return;
    const refresh = () => {
      try {
        setDevices(devicesService.getDevices());
        setRefreshError(undefined);
      } catch (error) {
        setRefreshError(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    };
    refresh();
    const interval = setInterval(refresh, process.platform === "win32" ? 10_000 : 300);
    return () => clearInterval(interval);
  }, [devicesService]);

  const error = serviceError ?? refreshError;

  return (
    <List isLoading={loading && !error}>
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title={error}
          description="Check Bluetooth access and extension preferences."
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
