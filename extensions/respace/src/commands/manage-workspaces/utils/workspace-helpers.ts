import { Color, Icon } from "@raycast/api";
import type { WorkspaceItemType } from "../../../types/workspace";

/**
 * Gets the icon for a workspace item type
 */
export function getItemIcon(type: WorkspaceItemType): Icon {
  switch (type) {
    case "app":
      return Icon.AppWindow;
    case "folder":
      return Icon.Folder;
    case "file":
      return Icon.Document;
    case "url":
      return Icon.Globe;
    case "terminal":
      return Icon.Terminal;
    default:
      return Icon.Circle;
  }
}

/**
 * Gets the color for a workspace item type
 */
export function getItemColor(type: WorkspaceItemType): Color {
  switch (type) {
    case "app":
      return Color.Blue;
    case "folder":
      return Color.Yellow;
    case "file":
      return Color.Green;
    case "url":
      return Color.Purple;
    case "terminal":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

/**
 * Gets the readable type name for a workspace item type
 */
export function getTypeName(type: WorkspaceItemType): string {
  switch (type) {
    case "app":
      return "Application";
    case "folder":
      return "Folder";
    case "file":
      return "File";
    case "url":
      return "URL";
    case "terminal":
      return "Terminal";
    default:
      return type;
  }
}

/**
 * Gets the placeholder text for a path input based on item type
 */
export function getPathPlaceholder(type: WorkspaceItemType): string {
  switch (type) {
    case "app":
      return "Select an application";
    case "folder":
      return "e.g., /Users/username/Documents";
    case "file":
      return "e.g., /Users/username/Documents/file.txt";
    case "url":
      return "e.g., https://github.com";
    case "terminal":
      return "e.g., npm start, cd ~/projects && git pull";
    default:
      return "";
  }
}

/**
 * Gets the label for a path input based on item type
 */
export function getPathLabel(type: WorkspaceItemType): string {
  switch (type) {
    case "app":
      return "Application Name";
    case "folder":
    case "file":
      return "File Path";
    case "url":
      return "URL";
    case "terminal":
      return "Terminal Command";
    default:
      return "Path";
  }
}

/**
 * Gets a subtitle for an item in the list (shows path or filename)
 */
export function getItemSubtitle(type: WorkspaceItemType, path: string): string {
  if (type === "terminal") return path;
  if (type === "url") return path;
  // For files/folders/apps, show just the filename
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}
