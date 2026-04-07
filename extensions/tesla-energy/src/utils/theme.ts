import { Color, Icon } from "@raycast/api";

// Chart hex colors (dark / light variants) and matching Raycast Color tints for icons.
// Single source of truth — used by both the Solar Production view and the menu bar.
export const COLORS = {
  solar: { dark: "#C9A227", light: "#B8860B", tint: Color.Yellow },
  home: { dark: "#7B68EE", light: "#6A5ACD", tint: Color.Purple },
  batteryPos: { dark: "#30D158", light: "#248A3D", tint: Color.Green }, // discharging
  batteryNeg: { dark: "#FF9F0A", light: "#C96D00", tint: Color.Orange }, // charging
  gridPos: { dark: "#AEAEB2", light: "#8E8E93", tint: Color.SecondaryText }, // importing
  gridNeg: { dark: "#5AC8FA", light: "#007AFF", tint: Color.Blue }, // exporting
  selfPower: { tint: Color.Green },
} as const;

export const ICONS = {
  selfPower: Icon.Leaf,
  solar: Icon.Sun,
  home: Icon.House,
  battery: Icon.Battery,
  charging: Icon.BatteryCharging,
  grid: Icon.Plug,
} as const;
