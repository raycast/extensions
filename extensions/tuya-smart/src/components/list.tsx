import { Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { timeConversion } from "../utils/functions";
import { Device, FunctionItem } from "../utils/interfaces";
import { CommandActionPanel, DeviceActionPanel } from "./actionPanels";
import { DeviceOnlineFilterType } from "./filter";

export interface DeviceListProps {
  isLoading: boolean;
  devices: Device[];
  searchBarPlaceholder?: string;
  searchBarAccessory?: JSX.Element;
  onSearchTextChange?: (q: string) => void;
  onAction: (device: Device) => void;
  filter: DeviceOnlineFilterType;
  pinnedSwitches: string[];
  onTogglePinSwitch: (deviceId: string, commandCode: string) => void;
}

export interface CommandListProps {
  device: Device;
  commands: FunctionItem[];
  onAction: (device: Device) => void;
}

export function DeviceList(props: DeviceListProps): JSX.Element {
  const devices = props.devices ?? [];
  const pinnedDevices = devices.filter((device) => {
    return device.pinned;
  });

  const notPinneddevices = devices.filter((device) => !device.pinned);

  // Extract all switches
  const allSwitches = devices.flatMap((device) =>
    (device.status || [])
      .filter((status) => status.code.toLowerCase().startsWith("switch") && typeof status.value === "boolean")
      .map((status) => ({ device, status }))
  );

  // Filter switches based on On/Off filter
  const filteredSwitches = allSwitches.filter(({ status }) => {
    if (props.filter === DeviceOnlineFilterType.On) return status.value === true;
    if (props.filter === DeviceOnlineFilterType.Off) return status.value === false;
    return true;
  });

  // Separate pinned and unpinned switches
  const pinnedSwitches = filteredSwitches.filter(({ device, status }) =>
    props.pinnedSwitches.includes(`${device.id}:${status.code}`)
  );
  const unpinnedSwitches = filteredSwitches.filter(
    ({ device, status }) => !props.pinnedSwitches.includes(`${device.id}:${status.code}`)
  );

  return (
    <List
      searchBarPlaceholder={props.searchBarPlaceholder}
      searchBarAccessory={props.searchBarAccessory}
      onSearchTextChange={props.onSearchTextChange}
      isLoading={props.isLoading}
      isShowingDetail
    >
      {(pinnedSwitches.length > 0 || pinnedDevices.length > 0) && (
        <List.Section title="Pinned">
          {pinnedSwitches.map(({ device, status }) => (
            <SwitchListItem
              key={`${device.id}-${status.code}`}
              device={device}
              command={status}
              onAction={props.onAction}
              isPinned={true}
              onTogglePin={props.onTogglePinSwitch}
            />
          ))}
          {pinnedDevices.map((device) => (
            <DeviceListItem key={`formula-${device.name}`} device={device} onAction={props.onAction} />
          ))}
        </List.Section>
      )}
      <List.Section title="Devices">
        {notPinneddevices.map((device) => (
          <DeviceListItem key={`formula-${device.name}`} device={device} onAction={props.onAction} />
        ))}
      </List.Section>
      <List.Section title="Switches">
        {unpinnedSwitches.map(({ device, status }) => (
          <SwitchListItem
            key={`${device.id}-${status.code}`}
            device={device}
            command={status}
            onAction={props.onAction}
            isPinned={false}
            onTogglePin={props.onTogglePinSwitch}
          />
        ))}
      </List.Section>
    </List>
  );
}

export function SwitchListItem(props: {
  command: FunctionItem;
  device: Device;
  onAction: (device: Device) => void;
  isPinned: boolean;
  onTogglePin: (deviceId: string, commandCode: string) => void;
}): JSX.Element {
  const [command, setCommand] = useState<FunctionItem>(props.command);
  const device = props.device;

  return (
    <List.Item
      title={command.name ?? command.code}
      accessories={[{ text: device.name }]}
      icon={{ source: Icon.Circle, tintColor: command.value ? Color.Green : Color.Red }}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Device Information" />
              <List.Item.Detail.Metadata.Label title="Name" text={device.name} />
              <List.Item.Detail.Metadata.Label title="Category" text={device.category} />
              <List.Item.Detail.Metadata.Label title="Id" text={device.id} />
              <List.Item.Detail.Metadata.Label title="Status" text={device.online ? "Online" : "Offline"} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Switch Information" />
              <List.Item.Detail.Metadata.Label title="Code" text={command.code} />
              <List.Item.Detail.Metadata.Label title="Value" text={command.value?.toString()} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <CommandActionPanel
          command={command}
          device={props.device}
          onTogglePinSwitch={props.onTogglePin}
          isPinned={props.isPinned}
          onAction={({ command }) => {
            setCommand(() => {
              return { ...command };
            });

            const statusIndex = props.device.status.findIndex((status) => status.code === command.code);
            if (statusIndex !== -1) {
              props.device.status[statusIndex] = command;
            }

            props.onAction({
              ...props.device,
            });
          }}
        />
      }
    />
  );
}

export function DeviceListItem(props: { device: Device; onAction: (device: Device) => void }): JSX.Element {
  const device = props.device;
  const category = device.category;
  const online = device.online;
  const tintColor = online ? Color.Green : Color.Red;
  const tooltip: string | undefined = online ? "Online" : "Offline";

  const icon = { source: Icon.Desktop, tintColor };

  return (
    <List.Item
      title={device.name}
      accessories={[{ text: category }]}
      icon={tooltip ? { value: icon, tooltip } : icon}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="General Information" />
              <List.Item.Detail.Metadata.Label title="Id" text={device.id} />
              <List.Item.Detail.Metadata.Label title="Status" text={device.online ? "Online" : "Offline"} />
              <List.Item.Detail.Metadata.Label title="Product Name" text={device.product_name} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Time Information" />
              <List.Item.Detail.Metadata.Label title="Active Time" text={timeConversion(device.active_time)} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Statuses" />
              {device.status &&
                device.status.map((status) => (
                  <List.Item.Detail.Metadata.Label
                    key={status.name ?? status.code}
                    title={status.name ?? status.code}
                    text={status.value?.toString()}
                  />
                ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
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
  const [device] = useState<Device>(props.device); // Although device isn't used in render, keeping it consistent with valid logic if needed

  return (
    <List.Item
      title={command.name ?? command.code}
      icon={{ source: Icon.Circle, tintColor: command.value ? Color.Green : Color.Red }}
      actions={
        <CommandActionPanel
          command={command}
          device={props.device}
          onAction={({ command }) => {
            setCommand(() => {
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
