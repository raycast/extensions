import { Icon } from "@raycast/api";

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

export function getPhoneIcon(label: string): Icon {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("mobile") || lowerLabel.includes("cell") || lowerLabel.includes("iphone")) {
    return Icon.Mobile;
  }
  if (lowerLabel.includes("home")) {
    return Icon.House;
  }
  if (lowerLabel.includes("work") || lowerLabel.includes("office")) {
    return Icon.Building;
  }
  return Icon.Phone;
}

export function getTagColor(label: string): string {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("mobile") || lowerLabel.includes("cell") || lowerLabel.includes("iphone")) {
    return "#007AFF";
  }
  if (lowerLabel.includes("home")) {
    return "#34C759";
  }
  if (lowerLabel.includes("work") || lowerLabel.includes("office")) {
    return "#FF9500";
  }
  return "#8E8E93";
}
