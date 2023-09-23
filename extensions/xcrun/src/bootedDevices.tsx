import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { Device } from "./types";
import { useEffect, useState } from "react";
import { getBootedSimulators } from "./util";

export function Devices(props: DevicesProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const devices = await getBootedSimulators();
        setDevices(devices);
        setLoading(false);
      } catch (err: any) {
        setLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: `Error getting devices: ${err}`,
        });
      }
    })();
  }, []);
  return (
    <List navigationTitle="Choose simulator" isLoading={loading}>
      {devices.map((item) => {
        const subtitle = `Last booted at: ${new Date(item.lastBootedAt).toUTCString()} `;
        return (
          <List.Item
            title={item.name}
            subtitle={subtitle}
            key={item.udid}
            actions={
              <ActionPanel>
                <Action.SubmitForm title="Choose" onSubmit={() => props.onDeviceChoose(item)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export interface DevicesProps {
  // devices: Device[]
  onDeviceChoose: (device: Device) => void;
}
