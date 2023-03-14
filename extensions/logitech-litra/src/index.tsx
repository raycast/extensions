import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";

import { getCliDirectory } from "./preferences";
import { getDevices, turnOff, turnOn } from "./utils";

interface Device {
  name: string;
  serial_number: string;
}

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);

  const cliDirectory = getCliDirectory();

  useEffect(() => {
    (async () => {
      const devices = await getDevices(cliDirectory);
      setDevices(devices);
    })();
  }, []);

  return (
    <List isLoading={false}>
      {devices.map((device) => (
        <List.Item
          key={device.serial_number}
          title={device.name}
          subtitle={device.serial_number}
          actions={
            <ActionPanel>
              <Action
                title="Turn On"
                icon={Icon.LightBulb}
                onAction={async () => {
                  await turnOn(cliDirectory, device.serial_number);
                  await showToast({ title: `Turned on ${device.name}`, style: Toast.Style.Success });
                }}
              />
              <Action
                title="Turn Off"
                icon={Icon.LightBulbOff}
                onAction={async () => {
                  await turnOff(cliDirectory, device.serial_number);
                  await showToast({ title: `Turned off ${device.name}`, style: Toast.Style.Success });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
