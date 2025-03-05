import { List, showToast, Toast } from "@raycast/api";
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
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch devices",
        message: String(error),
      });
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
    return DEVICE_TYPE_ORDER.indexOf(a) - DEVICE_TYPE_ORDER.indexOf(b);
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
