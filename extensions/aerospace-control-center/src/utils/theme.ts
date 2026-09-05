import { Icon } from "@raycast/api";

export const PALETTE = {
  slate: "#8290A3",
  blue: "#7D91AD",
  indigo: "#8887AA",
  teal: "#789B98",
  green: "#819B86",
  amber: "#AA9878",
  coral: "#AA7F79",
  secondary: "#858A93",
};

export const NEON = {
  blue: "#27D3FF",
  purple: "#B56CFF",
  cyan: "#27F0D2",
  green: "#48F08B",
  yellow: "#FFD85A",
  orange: "#FF9D4D",
  pink: "#FF63B4",
  red: "#FF667A",
};

export function coloredIcon(source: Icon, tintColor: string) {
  return { source, tintColor };
}

export type CompactGridIcon =
  | "bolt"
  | "code"
  | "focus"
  | "heartbeat"
  | "layout"
  | "list"
  | "maintenance"
  | "menu-bar"
  | "monitor"
  | "power"
  | "reload"
  | "resize"
  | "settings"
  | "status"
  | "status-ring"
  | "terminal"
  | "tools"
  | "window"
  | "workspaces";

export type CompactGridColor = keyof typeof NEON;

export function compactGridIcon(source: CompactGridIcon, color: CompactGridColor) {
  return { source: `grid-icons/${source}-${color}.png` };
}
