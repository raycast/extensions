import { getPreferenceValues } from "@raycast/api";

type DisplaySize = "small" | "medium" | "large";

interface DisplayPreferences {
  displaySize: DisplaySize;
}

const DISPLAY_SIZE_TO_ITEMS: Record<DisplaySize, number> = {
  small: 8,
  medium: 6,
  large: 4,
};

export function getColumnCount(): number {
  try {
    const { displaySize } = getPreferenceValues<DisplayPreferences>();
    return DISPLAY_SIZE_TO_ITEMS[displaySize] ?? DISPLAY_SIZE_TO_ITEMS.small;
  } catch (error) {
    console.error("Error reading display preferences:", error);
    return DISPLAY_SIZE_TO_ITEMS.small;
  }
}
