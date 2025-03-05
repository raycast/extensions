import { Color, Icon } from "@raycast/api";
import { Device, DeviceType } from "../types";

// Function to determine device type from name
export function getDeviceType(name: string): DeviceType {
  // Convert name to lowercase once for all comparisons
  const lowerName = name.toLowerCase();

  // iOS devices - usando verificações case-insensitive
  if (lowerName.includes("iphone")) return "iPhone";
  if (lowerName.includes("ipad")) return "iPad";
  if (lowerName.includes("apple tv")) return "Apple TV";
  if (lowerName.includes("apple watch")) return "Apple Watch";
  if (lowerName.includes("homepod")) return "HomePod";
  if (lowerName.includes("ipod")) return "iPod";
  if (lowerName.includes("mac")) return "Mac";

  // Android devices
  if (lowerName.includes("pixel")) return "Android Phone";
  if (lowerName.includes("tablet")) return "Android Tablet";
  if (lowerName.includes("tv")) return "Android TV";
  if (lowerName.includes("wear")) return "Android Wear";

  return "Other";
}

// Function to get a user-friendly status label
export function getStatusLabel(status: string): string {
  switch (status) {
    case "Booted":
      return "Running";
    case "Shutdown":
      return "Stopped";
    default:
      return status;
  }
}

// Function to get appropriate status icon
export function getStatusIcon(status: string) {
  switch (status) {
    case "Booted":
      return Icon.CheckCircle;
    case "Shutdown":
      return Icon.Circle;
    default:
      return Icon.QuestionMark;
  }
}

// Function to get status color
export function getStatusColor(status: string): Color | undefined {
  switch (status) {
    case "Booted":
      return Color.Green;
    default:
      return undefined;
  }
}

// Function to get device type icon
export function getDeviceTypeIcon(deviceType: string) {
  switch (deviceType) {
    // iOS devices
    case "iPhone":
      return Icon.Mobile;
    case "iPad":
      return Icon.Mobile;
    case "Apple Watch":
      return Icon.Mobile;
    case "Apple TV":
      return Icon.Mobile;
    case "HomePod":
      return Icon.Mobile;
    case "Mac":
      return Icon.Mobile;

    // Android devices
    case "Android Phone":
      return Icon.Mobile;
    case "Android Tablet":
      return Icon.Mobile;
    case "Android TV":
      return Icon.Mobile;
    case "Android Wear":
      return Icon.Mobile;

    default:
      return Icon.Mobile;
  }
}

// Filter devices based on search text and category
export function filterDevices(devices: Device[], searchText: string, selectedCategory: string): Device[] {
  return devices.filter((device) => {
    const matchesSearch = device.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory =
      selectedCategory.toLowerCase() === "all" || device.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });
}

// Group devices by type
export function groupDevicesByType(devices: Device[]): Record<string, Device[]> {
  return devices.reduce(
    (acc, device) => {
      if (!acc[device.deviceType]) {
        acc[device.deviceType] = [];
      }
      acc[device.deviceType].push(device);
      return acc;
    },
    {} as Record<string, Device[]>,
  );
}
