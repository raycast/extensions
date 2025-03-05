import { Color, Icon } from "@raycast/api";
import { Device } from "../types";

// Function to determine device type from name
export function getDeviceType(name: string): string {
  // iOS devices
  if (name.includes("iPhone")) return "iPhone";
  if (name.includes("iPad")) return "iPad";
  if (name.includes("Apple TV")) return "Apple TV";
  if (name.includes("Apple Watch")) return "Apple Watch";
  if (name.includes("HomePod")) return "HomePod";
  if (name.includes("iPod")) return "iPod";
  if (name.includes("Mac")) return "Mac";

  // Android devices
  if (name.includes("Pixel") || name.includes("pixel")) return "Android Phone";
  if (name.includes("Tablet") || name.includes("tablet")) return "Android Tablet";
  if (name.includes("TV") || name.includes("tv")) return "Android TV";
  if (name.includes("Wear") || name.includes("wear")) return "Android Wear";

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
    const matchesCategory = selectedCategory === "all" || device.category === selectedCategory;
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
