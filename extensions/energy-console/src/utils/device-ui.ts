import { Color, Icon, type Image } from "@raycast/api";
import { getDeviceCategory } from "../devices/catalog";
import type { DeviceCategory, DeviceSnapshot, PowerFlowState } from "../types/device";

export function getDeviceIcon(category: DeviceCategory): Image.ImageLike {
  return { source: getDeviceCategory(category).emoji };
}

export function getBatteryColor(level: number): Color {
  if (level >= 60) return Color.Green;
  if (level >= 30) return Color.Yellow;
  if (level >= 15) return Color.Orange;
  return Color.Red;
}

export function powerFlowLabel(state: PowerFlowState): string {
  switch (state) {
    case "charging":
      return "Charging";
    case "discharging":
      return "Discharging";
    case "idle":
      return "Idle";
    case "full":
      return "Full";
    default:
      return "Power flow unknown";
  }
}

export function powerFlowIcon(state: PowerFlowState): Image.ImageLike {
  switch (state) {
    case "charging":
      return { source: Icon.ArrowDown, tintColor: Color.Green };
    case "discharging":
      return { source: Icon.ArrowUp, tintColor: Color.Orange };
    case "full":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "idle":
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
    default:
      return Icon.QuestionMarkCircle;
  }
}

export function deviceSearchText(device: DeviceSnapshot): string {
  return [device.name, device.profile.displayName, device.productName, device.serialNumber].filter(Boolean).join(" ");
}
