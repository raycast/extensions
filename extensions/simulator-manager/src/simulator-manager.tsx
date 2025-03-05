import { List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Device } from "./types";
import { CATEGORIES, DEVICE_TYPE_ORDER, REFRESH_INTERVAL } from "./constants";
import { filterDevices, groupDevicesByType } from "./utils/device-utils";
import { fetchIOSDevices, fetchAndroidDevices } from "./utils/simulator-commands";
import { DeviceListItem } from "./components/DeviceListItem";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch all devices
  const fetchDevices = async () => {
    try {
      setIsLoading(true);

      // Fetch iOS simulators
      const iosDevices = await fetchIOSDevices();

      // Fetch Android emulators
      const androidDevices = await fetchAndroidDevices();

      setDevices([...iosDevices, ...androidDevices]);
    } catch (error) {
      console.error("Error fetching devices:", error);
      showFailureToast(error, { title: "Failed to fetch devices" });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and set up refresh interval
  useEffect(() => {
    fetchDevices();

    // Set up a refresh interval
    const intervalId = setInterval(fetchDevices, REFRESH_INTERVAL);

    // Clean up the interval when component unmounts
    return () => clearInterval(intervalId);
  }, []);

  // Filter and group devices
  const filteredDevices = filterDevices(devices, searchText, selectedCategory);
  const groupedDevices = groupDevicesByType(filteredDevices);

  // Sort device types for consistent ordering
  const deviceTypes = Object.keys(groupedDevices).sort((a, b) => {
    const indexA = DEVICE_TYPE_ORDER.indexOf(a);
    const indexB = DEVICE_TYPE_ORDER.indexOf(b);

    // If both types are in the order array, sort by their positions
    if (indexA >= 0 && indexB >= 0) {
      return indexA - indexB;
    }

    // If only a is in the order array, it comes first
    if (indexA >= 0) {
      return -1;
    }

    // If only b is in the order array, it comes first
    if (indexB >= 0) {
      return 1;
    }

    // If neither is in the order array, sort alphabetically
    return a.localeCompare(b);
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search devices..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by device type" value={selectedCategory} onChange={setSelectedCategory}>
          {CATEGORIES.map((category) => (
            <List.Dropdown.Item key={category.id} title={category.name} value={category.id} />
          ))}
        </List.Dropdown>
      }
    >
      {deviceTypes.map((deviceType) => (
        <List.Section key={deviceType} title={deviceType}>
          {groupedDevices[deviceType].map((device) => (
            <DeviceListItem key={device.id} device={device} onRefresh={fetchDevices} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
