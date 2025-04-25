import { Icon } from "@raycast/api";

export interface ColorOption {
  name: string;
  value: string;
  icon: Icon;
}

export const COLORS: ColorOption[] = [
  { name: "Coral", value: "#FF7F7F", icon: Icon.CircleFilled },
  { name: "Apricot", value: "#FFB347", icon: Icon.CircleFilled },
  { name: "Gold", value: "#FFD700", icon: Icon.CircleFilled },
  { name: "Sage", value: "#9DC183", icon: Icon.CircleFilled },
  { name: "Azure", value: "#007FFF", icon: Icon.CircleFilled },
  { name: "Orchid", value: "#DA70D6", icon: Icon.CircleFilled },
];
