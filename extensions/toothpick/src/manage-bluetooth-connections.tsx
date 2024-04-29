import { ActionPanel, List, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { getDevicesService } from "./core/devices/devices.service";
import { Device } from "./core/devices/devices.model";

export default function ManageBluetoothConnectionsView() {
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);

  const { bluetoothBackend } = getPreferenceValues<ExtensionPreferences>();
  const devicesService = getDevicesService(bluetoothBackend);

  if (!devicesService) {
    throw new Error("Could not find 'blueutil'!");
  }

  const refreshDataLoop = () => {
    setDevices(devicesService?.getDevices() ?? []);
    setTimeout(() => refreshDataLoop(), 300);
  };

  useEffect(() => {
    setDevices(devicesService?.getDevices() ?? []);
    setLoading(false);
    refreshDataLoop();
  }, []);

  return (
    <List isLoading={loading}>
      {devices.map((device) => (
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
      ))}
    </List>
  );
}
