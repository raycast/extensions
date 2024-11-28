import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { DevicesMap } from "./core/devices/constants/specifications";
import { useState } from "react";

export default function SupportedDevicesView() {
  const [mockConnectionStatus, setMockConnectionStatus] = useState(false);
  const devices = Object.entries(DevicesMap).flatMap(([, v]) => Object.entries(v));

  return (
    <List>
      <List.Item
        icon={{ source: Icon.Power, tintColor: Color.PrimaryText }}
        title={"Toggle mocked connection state"}
        actions={
          <ActionPanel>
            <Action title={"Toggle"} onAction={() => setMockConnectionStatus(!mockConnectionStatus)} />
          </ActionPanel>
        }
      />
      {devices.map(([id, metadata]) => {
        const iconPath = mockConnectionStatus ? metadata.main?.replace(/\/(?=[^/]*$)/, "/connected/") : metadata.main;

        return (
          <List.Item
            key={id}
            icon={iconPath ? { source: iconPath } : undefined}
            title={metadata.name ?? "Missing name"}
            actions={
              <ActionPanel>
                <Action title={"Toggle"} onAction={() => setMockConnectionStatus(!mockConnectionStatus)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
