import { Color, Icon } from "@raycast/api";
import { Device, DeviceType } from "./types";

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

export function getDeviceType(name: string): DeviceType {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("iphone")) return "iPhone";
  if (lowerName.includes("ipad")) return "iPad";
  if (lowerName.includes("apple tv")) return "Apple TV";
  if (lowerName.includes("apple watch")) return "Apple Watch";
  if (lowerName.includes("homepod")) return "HomePod";
  if (lowerName.includes("ipod")) return "iPod";
  if (lowerName.includes("mac")) return "Mac";

  if (lowerName.includes("pixel")) return "Android Phone";
  if (lowerName.includes("tablet")) return "Android Tablet";
  if (lowerName.includes("tv")) return "Android TV";
  if (lowerName.includes("wear")) return "Android Wear";

  return "Other";
}

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

export function getStatusColor(status: string): Color | undefined {
  switch (status) {
    case "Booted":
      return Color.Green;
    default:
      return undefined;
  }
}

export function formatDeviceVersion(runtime: string, category: string): string {
  if (category === "ios") {
    return runtime.replace("iOS-", "iOS ").replace(/-/g, ".").replace("tvOS-", "tvOS ").replace("watchOS-", "watchOS ");
  }

  return runtime;
}

export function filterDevices(devices: Device[], searchText: string, selectedCategory: string): Device[] {
  return devices.filter((device) => {
    const matchesSearch = device.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory =
      selectedCategory.toLowerCase() === "all" || device.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });
}

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
