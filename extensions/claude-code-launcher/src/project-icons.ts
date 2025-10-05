import { Icon, Image } from "@raycast/api";

export const PROJECT_ICON_NAMES = [
  "Folder",
  "Star",
  "Code",
  "Terminal",
  "House",
  "Desktop",
  "Document",
  "Download",
  "Globe",
  "Hammer",
  "HardDrive",
  "Rocket",
  "Box",
  "Book",
  "Bookmark",
  "Bug",
  "Gear",
  "CommandSymbol",
  "Compass",
  "Cpu",
  "Dot",
  "Heart",
  "Key",
  "Layers",
  "LightBulb",
  "Link",
  "Lock",
  "Mountain",
  "Network",
  "Package",
  "Paperclip",
  "Pin",
  "Plug",
  "Server",
  "Shield",
  "Tag",
  "Trophy",
  "Wand",
  "WrenchScrewdriver",
] as const;

export type IconName = (typeof PROJECT_ICON_NAMES)[number];

export function getIcon(name: string, fallback: string = "Folder"): Image {
  const iconName = name in Icon ? name : fallback in Icon ? fallback : "Folder";
  const iconValue = Icon[iconName as keyof typeof Icon];

  return {
    source: iconValue,
  };
}
