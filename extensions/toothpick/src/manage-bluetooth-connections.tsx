import { ActionPanel, List } from "@raycast/api";
import { getDevices } from "./services/devices";
import { useState, useEffect } from "react";
import { Device } from "./types";

export default function ManageBluetoothConnectionsView() {
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);

  const refreshDataLoop = () => {
    setDevices(getDevices());
    setTimeout(() => refreshDataLoop(), 300);
  };

  useEffect(() => {
    setDevices(getDevices());
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
          subtitle={device.model}
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
