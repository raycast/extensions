import { List, ActionPanel, Action, Icon } from "@raycast/api";
import DeviceCommands from "../device-commands";
import type { Device } from "../types";

/**
 * Props interface for the DeviceItem component
 */
interface DeviceItemProps {
  /** The device object containing device information */
  device: Device;
  /** Callback function to toggle device state */
  onToggle: (device: Device) => void;
  /** Callback function to refresh the devices list */
  onRefresh: () => void;
  /** Callback function to open extension preferences */
  onOpenPreferences: () => void;
}

/**
 * DeviceItem component that renders a single device in the devices list
 *
 * @param props - The component props
 * @param props.device - The device object containing device information
 * @param props.onToggle - Callback function to toggle device state
 * @param props.onRefresh - Callback function to refresh the devices list
 * @param props.onOpenPreferences - Callback function to open extension preferences
 *
 * @returns A List.Item component representing the device with actions
 */
export function DeviceItem({ device, onToggle, onRefresh, onOpenPreferences }: DeviceItemProps) {
  return (
    <List.Item
      key={device.device_id}
      title={device.name}
      subtitle={`${device.series} ${device.model} • ${device.color}`}
      accessories={
        device?.metadata?.ssid
          ? [
              {
                icon: Icon.Wifi,
                tooltip: `Connected to ${device.metadata.ssid}`,
              },
            ]
          : undefined
      }
      icon={Icon.ComputerChip}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Device Commands"
            target={
              <DeviceCommands
                arguments={{
                  deviceId: device.device_id,
                  deviceName: device.name,
                  deviceModel: device.model,
                  deviceSeries: device.series,
                }}
              />
            }
            icon={Icon.List}
          />
          <Action title="Toggle Device" onAction={() => onToggle(device)} icon={Icon.Power} />
          <Action title="Refresh Devices" onAction={onRefresh} icon={Icon.ArrowClockwise} />
          <Action title="Open Extension Preferences" onAction={onOpenPreferences} icon={Icon.Gear} />
        </ActionPanel>
      }
    />
  );
}
