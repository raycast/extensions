import { closeMainWindow, Color, Icon } from "@raycast/api";
import { Device, DeviceType } from "./types";
import { showFailureToast } from "@raycast/utils";

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

export function getStatusLabel(status: string) {
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

export function getStatusColor(status: string) {
  switch (status) {
    case "Booted":
      return Color.Green;
    default:
      return undefined;
  }
}

export function filterDevices(devices: Device[], searchText: string, selectedCategory: string) {
  const lowerSearchText = searchText.toLowerCase();
  const lowerSelectedCategory = selectedCategory.toLowerCase();
  const isAllCategory = lowerSelectedCategory === "all";

  if (isAllCategory) {
    return devices.filter((device) => device.name.toLowerCase().includes(lowerSearchText));
  }

  return devices.filter(
    (device) =>
      device.name.toLowerCase().includes(lowerSearchText) && device.category.toLowerCase() === lowerSelectedCategory,
  );
}

export function groupDevicesByType(devices: Device[]) {
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

export async function executeWithErrorHandling(action: () => Promise<void>, onSuccess?: () => void) {
  try {
    await action();
    if (onSuccess) onSuccess();
  } catch (error) {
    showFailureToast(error);
  } finally {
    closeMainWindow();
  }
}

export function getAndroidVersionFromApiLevel(apiLevel: number) {
  const versionMap: Record<number, string> = {
    35: "15.0", // Android U
    34: "14.0", // Android Upside Down Cake
    33: "13.0", // Android Tiramisu
    32: "12.1", // Android 12L
    31: "12.0", // Android Snow Cone
    30: "11.0", // Android Red Velvet Cake
    29: "10.0", // Android Quince Tart
    28: "9.0", // Android Pie
    27: "8.1", // Android Oreo
    26: "8.0", // Android Oreo
    25: "7.1", // Android Nougat
    24: "7.0", // Android Nougat
    23: "6.0", // Android Marshmallow
    22: "5.1", // Android Lollipop
    21: "5.0", // Android Lollipop
  };

  return `Android ${versionMap[apiLevel] ?? `API ${apiLevel}`}`;
}
