import fs from "fs";
import path from "path";

/**
 * Resolves an icon path for the frontmost application.
 * On Windows, Raycast can render the executable itself as an icon, so we return
 * the path directly if it exists. If no icon can be resolved, an empty string
 * is returned to fall back to Raycast's default icon rendering.
 */
export function getAppIconPath(appPath: string): string {
  if (process.platform === "win32") {
    return fs.existsSync(appPath) ? appPath : "";
  }

  // Fallback for non-Windows environments: try a nearby .ico/.icns file, else return empty.
  const candidatePaths = [
    appPath,
    `${appPath}.ico`,
    path.join(appPath, "Contents", "Resources", "AppIcon.icns"),
    path.join(appPath, "Contents", "Resources", "icon.icns"),
  ];

  const found = candidatePaths.find((candidate) => fs.existsSync(candidate));
  return found ?? "";
}
