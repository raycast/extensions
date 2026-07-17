import { ActionPanel, List } from "@raycast/api";
import { useMemo } from "react";
import { Device } from "../types";
import { getDeviceTypeIcon, getStatusIcon, getStatusLabel, getStatusColor } from "../utils";
import { IOSDeviceActions, AndroidDeviceActions, CommonDeviceActions } from "./DeviceActions";

interface DeviceListItemProps {
  device: Device;
  onRefresh: () => void;
}

function getDeviceActionComponent(category: string, device: Device, onRefresh: () => void) {
  const actionComponents = {
    ios: <IOSDeviceActions device={device} onRefresh={onRefresh} />,
    android: <AndroidDeviceActions device={device} onRefresh={onRefresh} />,
  };

  return actionComponents[category as keyof typeof actionComponents] || null;
}

export function DeviceListItem({ device, onRefresh }: DeviceListItemProps) {
  const accessories = useMemo(
    () => [
      {
        text: device.runtime,
        tooltip: `Version: ${device.runtime}`,
      },
      {
        icon: { source: getStatusIcon(device.status), tintColor: getStatusColor(device.status) },
        text: { value: getStatusLabel(device.status), color: getStatusColor(device.status) },
        tooltip: `Status: ${device.status}`,
      },
    ],
    [device.status, device.runtime],
  );

  const categorySpecificActions = getDeviceActionComponent(device.category, device, onRefresh);

  return (
    <List.Item
      icon={getDeviceTypeIcon(device.deviceType)}
      title={device.name}
      subtitle={device.deviceType}
      accessories={accessories}
      actions={
        <ActionPanel>
          {categorySpecificActions}
          <CommonDeviceActions device={device} onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
