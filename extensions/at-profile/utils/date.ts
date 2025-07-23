import { List } from "@raycast/api";

/**
 * Formats a timestamp into a List.Item.Accessory that Raycast will display as relative time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns List.Item.Accessory with date property for relative time display
 */
export function formatRelativeDate(timestamp: number): List.Item.Accessory {
  return { date: new Date(timestamp) };
}
