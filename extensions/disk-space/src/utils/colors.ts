import { Color, Icon } from "@raycast/api";
import { DriveCategory, DriveHealthStatus } from "../types/storage";

/**
 * Returns the Raycast Color corresponding to a drive's usage percentage.
 * Thresholds:
 *  - < 70%: Green (Normal)
 *  - 70% - 84.99%: Yellow (Moderate)
 *  - 85% - 89.99%: Orange (High)
 *  - >= 90%: Red (Critical Low Space)
 */
export function getUsageColor(percentage: number): Color {
  if (isNaN(percentage) || percentage < 0) {
    return Color.SecondaryText;
  }
  if (percentage < 70) {
    return Color.Green;
  }
  if (percentage < 85) {
    return Color.Yellow;
  }
  if (percentage < 90) {
    return Color.Orange;
  }
  return Color.Red;
}

/**
 * Returns the Raycast Color matching the drive's health status.
 */
export function getHealthColor(healthStatus: DriveHealthStatus): Color {
  switch (healthStatus) {
    case "Healthy":
      return Color.Green;
    case "Warning":
      return Color.Orange;
    case "Critical":
      return Color.Red;
    case "Unknown":
    default:
      return Color.SecondaryText;
  }
}

/**
 * Returns the Raycast Icon appropriate for each drive category.
 */
export function getCategoryIcon(category: DriveCategory): Icon {
  switch (category) {
    case "internal":
      return Icon.HardDrive;
    case "removable":
      return Icon.MemoryStick;
    case "network":
      return Icon.Network;
    case "virtual":
      return Icon.Cd;
    case "optical":
      return Icon.Cd;
    case "unknown":
    default:
      return Icon.HardDrive;
  }
}
