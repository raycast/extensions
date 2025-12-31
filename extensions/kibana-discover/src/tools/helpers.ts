import { Icon } from "@raycast/api";

/**
 * Get the appropriate icon for a data view based on its name
 */
export function getDataViewIcon(dataViewName: string): Icon {
  const lowerName = dataViewName.toLowerCase();
  if (lowerName.includes("production") || lowerName.includes("prod")) {
    return Icon.Crown;
  }
  return Icon.Gear;
}
