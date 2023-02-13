import { Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { Device, FunctionItem } from "../utils/interfaces";
import { CommandActionPanel, DeviceActionPanel } from "./actionPanels";

export interface DeviceListProps {
  isLoading: boolean;
  devices: Device[];
  searchBarPlaceholder?: string;
  searchBarAccessory?: JSX.Element;
  onSearchTextChange?: (q: string) => void;
  onAction: (device: Device) => void;
}

export interface CommandListProps {
  device: Device;
  commands: FunctionItem[];
  onAction: (device: Device) => void;
}

export function DeviceList(props: DeviceListProps): JSX.Element {
  const devices = props.devices;

  const pinnedDevices = devices.filter((device) => {
    return device.pinned;
  });

  const notPinneddevices = devices.filter((device) => !device.pinned);
  return (
    <List
      searchBarPlaceholder={props.searchBarPlaceholder}
      searchBarAccessory={props.searchBarAccessory}
      onSearchTextChange={props.onSearchTextChange}
      isLoading={props.isLoading}
    >
      <List.Section title="Pinned">
        {pinnedDevices.map((device) => (
          <DeviceListItem key={`formula-${device.name}`} device={device} onAction={props.onAction} />
        ))}
      </List.Section>
      <List.Section title="Devices">
        {notPinneddevices.map((device) => (
          <DeviceListItem key={`formula-${device.name}`} device={device} onAction={props.onAction} />
        ))}
      </List.Section>
    </List>
  );
}

export function DeviceListItem(props: { device: Device; onAction: (device: Device) => void }): JSX.Element {
  const device = props.device;
  const category = device.category;
  const online = device.online;
  const tintColor = online ? Color.Green : Color.Red;
  const tooltip: string | undefined = online ? "Online" : "Offline";

  const icon = { source: Icon.Circle, tintColor };

  return (
    <List.Item
      title={device.name}
      accessories={[{ text: category }]}
      icon={tooltip ? { value: icon, tooltip } : icon}
      actions={<DeviceActionPanel device={device} showDetails={true} onAction={props.onAction} />}
    />
  );
}

export function CommandList(props: CommandListProps): JSX.Element {
  const [commands] = useState<FunctionItem[]>(props.commands);
  const [device] = useState<Device>(props.device);
  return (
    <List>
      {commands.map((command) => (
        <CommandListItem
          key={`command-${command.name ?? command.code}`}
          command={command}
          device={device}
          onAction={props.onAction}
        />
      ))}
    </List>
  );
}

export function CommandListItem(props: {
  command: FunctionItem;
  device: Device;
  onAction: (device: Device) => void;
}): JSX.Element {
  const [command, setCommand] = useState<FunctionItem>(props.command);
  return (
    <List.Item
      title={command.name ?? command.code}
      icon={{ source: Icon.Circle, tintColor: command.value ? Color.Green : Color.Red }}
      actions={
        <CommandActionPanel
          command={command}
          device={props.device}
          onAction={({ command }) => {
            setCommand((prev) => {
              return { ...command };
            });

            const statusIndex = props.device.status.findIndex((status) => status.code === command.code);
            props.device.status[statusIndex] = command;

            props.onAction({
              ...props.device,
            });
          }}
        />
      }
    />
  );
}
