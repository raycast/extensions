import { List, Icon, Color } from "@raycast/api";

export const STANDARD_ACCESSORIES = {
  ERROR: [{ text: "Setup required", icon: { source: Icon.ExclamationMark, tintColor: Color.Red } }],
  LOADING: [{ text: "Loading...", icon: { source: Icon.Clock, tintColor: Color.SecondaryText } }],
  NO_DATA: [{ text: "No data", icon: { source: Icon.Circle, tintColor: Color.SecondaryText } }],
} as const satisfies Record<string, List.Item.Accessory[]>;
