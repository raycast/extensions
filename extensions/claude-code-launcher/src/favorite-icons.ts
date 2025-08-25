import { Icon, Image } from "@raycast/api";

// Claude's official brand color for consistent UI theming
const CLAUDE_COLOR = "#C15F3C";

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

export function getIcon(name: string, fallback: string = "Folder"): Image {
  const iconName = name in Icon ? name : fallback in Icon ? fallback : "Folder";
  const iconValue = Icon[iconName as keyof typeof Icon];

  return {
    source: iconValue,
    tintColor: CLAUDE_COLOR,
  };
}
