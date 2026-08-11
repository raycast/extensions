import type { Application } from "@raycast/api";
import type { DriveItem } from "../types";

/**
 * Office app identifiers
 */
export const OFFICE_APPS: Record<string, { bundleId: string; windowsName: string }> = {
  Word: { bundleId: "com.microsoft.Word", windowsName: "Word" },
  Excel: { bundleId: "com.microsoft.Excel", windowsName: "Excel" },
  PowerPoint: { bundleId: "com.microsoft.Powerpoint", windowsName: "PowerPoint" },
};

export type OfficeAppName = keyof typeof OFFICE_APPS;

/**
 * Get the drive name based on drive type
 */
export function getDriveName(driveType?: string): string {
  if (driveType === "documentLibrary") {
    return "SharePoint";
  } else if (driveType === "business") {
    return "OneDrive for Business";
  }
  return "OneDrive";
}

/**
 * Generate markdown preview for the detail view
 */
export function getMarkdownPreview(item: DriveItem): string {
  if (item.thumbnails && item.thumbnails.length > 0) {
    const thumbnail = item.thumbnails[0].large || item.thumbnails[0].medium || item.thumbnails[0].small;
    if (thumbnail?.url) {
      return `![${item.name}](${thumbnail.url})`;
    }
  }

  if (item.folder) {
    return `<img src="icons/folder.png" alt="Folder" width="192" height="192" />`;
  }

  return "";
}

/**
 * Get the Office app name based on file extension
 */
export function getOfficeAppName(item: DriveItem): OfficeAppName | null {
  if (item.folder) return null;

  const extension = item.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    // Word documents and templates
    case "doc":
    case "docx":
    case "docm":
    case "dot":
    case "dotx":
    case "dotm":
      return "Word";
    // Excel spreadsheets and templates
    case "xls":
    case "xlsx":
    case "xlsm":
    case "xlsb":
    case "xlt":
    case "xltx":
    case "xltm":
    case "csv":
      return "Excel";
    // PowerPoint presentations and templates
    case "ppt":
    case "pptx":
    case "pptm":
    case "pot":
    case "potx":
    case "potm":
    case "pps":
    case "ppsx":
    case "ppsm":
      return "PowerPoint";
    default:
      return null;
  }
}

/**
 * Get item icon based on thumbnail or file type
 */
export function getItemIcon(item: DriveItem): { source: string } | { fileIcon: string } {
  if (item.thumbnails && item.thumbnails.length > 0 && item.thumbnails[0].small?.url) {
    const thumbnailUrl = item.thumbnails[0].small.url;
    return { source: thumbnailUrl };
  }

  if (item.folder) {
    return { source: "icons/folder.png" };
  }

  // Use native system file icon based on file extension
  return { fileIcon: item.name };
}

/**
 * Find installed Office apps from a list of applications
 */
export function findInstalledOfficeApps(allApps: Application[]): Map<string, Application> {
  const officeApps = new Map<string, Application>();

  for (const [appName, identifiers] of Object.entries(OFFICE_APPS)) {
    const app = allApps.find((a) => a.bundleId === identifiers.bundleId || a.name === identifiers.windowsName);
    if (app) {
      officeApps.set(appName, app);
    }
  }

  return officeApps;
}
