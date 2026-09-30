import { Image } from "@raycast/api";

type IconAsset = {
  light: Image.Asset;
  dark: Image.Asset;
};

export const priorityIcons: Record<string, IconAsset> = {
  0: { light: "light/priority-no-priority.svg", dark: "dark/priority-no-priority.svg" },
  1: { light: "light/priority-urgent.svg", dark: "dark/priority-urgent.svg" },
  2: { light: "light/priority-high.svg", dark: "dark/priority-high.svg" },
  3: { light: "light/priority-medium.svg", dark: "dark/priority-medium.svg" },
  4: { light: "light/priority-low.svg", dark: "dark/priority-low.svg" },
};
