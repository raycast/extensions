import { List } from "@raycast/api";
import { Device } from "../types";
import { DEVICE_TYPE_ORDER } from "../constants";
import { groupDevicesByType } from "../utils";
import { DeviceListItem } from "./DeviceListItem";
import { DeviceEmptyView } from "./DeviceEmptyView";

interface DeviceListProps {
  devices: Device[];
  onRefresh: () => void;
  selectedCategory: string;
  searchText: string;
  androidSdkFound: boolean;
  xcodeFound: boolean;
  isLoading: boolean;
}

export function DeviceList({
  devices = [],
  onRefresh,
  selectedCategory,
  searchText = "",
  androidSdkFound,
  isLoading,
  xcodeFound,
}: DeviceListProps) {
  const groupedDevices = groupDevicesByType(devices);

  if (devices.length === 0) {
    return (
      <DeviceEmptyView
        androidSdkFound={androidSdkFound}
        isLoading={isLoading}
        isSearching={searchText.length > 0}
        onRefresh={onRefresh}
        selectedCategory={selectedCategory}
        xcodeFound={xcodeFound}
      />
    );
  }

  const deviceTypes = Object.keys(groupedDevices).sort((a, b) => {
    const indexA = DEVICE_TYPE_ORDER.indexOf(a);
    const indexB = DEVICE_TYPE_ORDER.indexOf(b);

    if (indexA >= 0 && indexB >= 0) return indexA - indexB;
    if (indexA >= 0) return -1;
    if (indexB >= 0) return 1;

    return a.localeCompare(b);
  });

  return (
    <>
      {deviceTypes.map((deviceType) => (
        <List.Section key={deviceType} title={deviceType}>
          {groupedDevices[deviceType].map((device) => (
            <DeviceListItem key={device.id} device={device} onRefresh={onRefresh} />
          ))}
        </List.Section>
      ))}
    </>
  );
}
