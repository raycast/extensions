import { ActionPanel, List } from "@raycast/api";
import { useMemo } from "react";
import { Device } from "../types";
import { getDeviceTypeIcon, getStatusIcon, getStatusLabel, getStatusColor, formatDeviceVersion } from "../utils";
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
  const formattedVersion = useMemo(
    () => formatDeviceVersion(device.runtime, device.category),
    [device.runtime, device.category],
  );

  const accessories = useMemo(
    () => [
      {
        text: formattedVersion,
        tooltip: `Version: ${formattedVersion}`,
      },
      {
        icon: { source: getStatusIcon(device.status), tintColor: getStatusColor(device.status) },
        text: { value: getStatusLabel(device.status), color: getStatusColor(device.status) },
        tooltip: `Status: ${device.status}`,
      },
    ],
    [formattedVersion, device.status],
  );

  const categorySpecificActions = getDeviceActionComponent(device.category, device, onRefresh);

  return (
    <List.Item
      key={device.id}
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
