import { Icon } from "@raycast/api";

export const FAVORITE_ICON_NAMES = [
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

export type IconName = (typeof FAVORITE_ICON_NAMES)[number];

export function getIcon(name: string): Icon {
  return Icon[name as keyof typeof Icon] || Icon.Folder;
}
