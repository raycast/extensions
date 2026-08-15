import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import DeviceControl from "./components/device-control";
import { useBonjour } from "./hooks/use-bonjour";

export default function ControlDevice() {
  const [isLoading, setIsLoading] = useState(true);
  const devices = useBonjour();

  // Give us a second to load devices before showing EmptyView
  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <List isLoading={isLoading && devices.length === 0}>
      {devices.length > 0 ? (
        devices.map((device) => (
          <List.Item
            key={device.host}
            title={device.name}
            actions={
              <ActionPanel>
                <Action.Push title="Control" target={<DeviceControl device={device} />} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView title="No Tuneblade Devices Found" />
      )}
    </List>
  );
}
