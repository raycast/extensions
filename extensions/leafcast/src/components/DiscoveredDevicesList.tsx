import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { DiscoveredDevice } from "../utils";

interface Props {
  devices: DiscoveredDevice[];
  onSelect: (address: string) => void;
}

export function DiscoveredDevicesList({ devices, onSelect }: Props) {
  const { pop } = useNavigation();

  function handleSelect(address: string) {
    onSelect(address);
    pop();
  }

  return (
    <List navigationTitle="Discovered Devices">
      {devices.map((device) => (
        <List.Item
          key={`${device.name}@${device.address}`}
          title={device.name}
          subtitle={device.address}
          icon={Icon.LightBulb}
          actions={
            <ActionPanel>
              <Action title="Use This Device" icon={Icon.Checkmark} onAction={() => handleSelect(device.address)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
