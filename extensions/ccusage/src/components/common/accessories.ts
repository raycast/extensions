import { List, Icon, Color } from "@raycast/api";

export const STANDARD_ACCESSORIES = {
  ERROR: [{ text: "Setup required", icon: { source: Icon.ExclamationMark, tintColor: Color.Red } }],
  NO_DATA: [{ text: "No data", icon: Icon.Circle }],
} as const satisfies Record<string, List.Item.Accessory[]>;
