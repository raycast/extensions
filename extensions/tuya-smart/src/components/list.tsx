import { Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { Device, Status } from "../utils/interfaces";
import { CommandActionPanel, DeviceActionPanel } from "./actionPanels";

export interface DeviceListProps {
  isLoading: boolean;
  devices: Device[];
  searchBarPlaceholder?: string;
  searchBarAccessory?: JSX.Element;
  onSearchTextChange?: (q: string) => void;
  onAction: () => void;
}

export interface CommandListProps {
  device: Device;
  commands: Status[];
  onAction: () => void;
}

export function DeviceList(props: DeviceListProps): JSX.Element {
  const devices = props.devices;
  return (
    <List
      searchBarPlaceholder={props.searchBarPlaceholder}
      searchBarAccessory={props.searchBarAccessory}
      onSearchTextChange={props.onSearchTextChange}
      isLoading={props.isLoading}
    >
      {devices.map((device) => (
        <DeviceListItem key={`formula-${device.name}`} device={device} onAction={props.onAction} />
      ))}
    </List>
  );
}

export function DeviceListItem(props: { device: Device; onAction: () => void }): JSX.Element {
  const device = props.device;
  let category = device.category;
  let online = device.online;
  let tintColor = online ? Color.Green : Color.Red;
  let tooltip: string | undefined = online ? "Online" : "Offline";

  const icon = { source: Icon.Circle, tintColor };

  return (
    <List.Item
      title={device.name}
      accessories={[{ text: device.category }]}
      icon={tooltip ? { value: icon, tooltip } : icon}
      actions={<DeviceActionPanel device={device} showDetails={true} onAction={props.onAction} />}
    />
  );
}

export function CommandList(props: CommandListProps): JSX.Element {
  const [commands, setCommands] = useState<Status[]>(props.commands);
  const [device, setDevice] = useState<Device>(props.device);
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

export function CommandListItem(props: { command: Status; device: Device; onAction: () => void }): JSX.Element {
  const [command, setCommand] = useState<Status>(props.command);
  return (
    <List.Item
      title={command.name ?? command.code}
      icon={{ source: Icon.Circle, tintColor: command.value ? Color.Green : Color.Red }}
      actions={
        <CommandActionPanel
          command={command}
          device={props.device}
          onAction={({ result, newValue }) => {
            setCommand((prev) => {
              return {
                ...prev,
                value: newValue,
              };
            });
            props.onAction();
          }}
        />
      }
    />
  );
}
