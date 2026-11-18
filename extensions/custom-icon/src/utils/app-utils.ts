import { Alert, confirmAlert } from "@raycast/api";
import { execSync } from "child_process";
import { statSync } from "fs";
import { basename, extname } from "path";
import { VALID_ICON_EXTENSIONS, VALID_IMAGE_EXTENSIONS } from "./constants";

export type TargetType = "app" | "file" | "folder";

/**
 * Detect the target type from a path
 */
export function getTargetType(targetPath: string): TargetType {
  if (targetPath.endsWith(".app")) {
    return "app";
  }
  try {
    const stat = statSync(targetPath);
    return stat.isDirectory() ? "folder" : "file";
  } catch {
    return "file"; // Default to file if we can't stat
  }
}

/**
 * Validate if a file path has a supported icon extension
 */
export function isValidIconFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return VALID_ICON_EXTENSIONS.includes(ext);
}

/**
 * Validate if a file path has a supported image extension
 */
export function isValidImageFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return VALID_IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Get a human-readable list of valid extensions
 */
export function getValidIconExtensions(): string {
  return VALID_ICON_EXTENSIONS.map((ext) => ext.toUpperCase().slice(1)).join(", ");
}

/**
 * Check if a macOS app is currently running using AppleScript
 */
export function isAppRunning(appPath: string): boolean {
  if (!appPath.endsWith(".app")) return false;

  const appName = basename(appPath, ".app");
  try {
    const result = execSync(
      `osascript -e 'tell application "System Events" to (name of processes) contains "${appName}"'`,
      { encoding: "utf-8", timeout: 5000 },
    ).trim();
    return result === "true";
  } catch {
    return false;
  }
}

export async function confirmAppRestart(appPath: string): Promise<boolean> {
  const appName = basename(appPath, ".app");
  return confirmAlert({
    title: `Restart ${appName}?`,
    message: `"${appName}" is currently running. It will be quit and relaunched after the icon is changed.`,
    primaryAction: {
      title: "Restart App",
      style: Alert.ActionStyle.Destructive,
    },
    dismissAction: {
      title: "Cancel",
    },
  });
}
