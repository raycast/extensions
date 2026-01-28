import path from "path";
import fs from "fs";
import plist from "plist";

/**
 * Resolves an icon path for the frontmost application.
 * - Windows: Raycast can render the executable itself as an icon, so we return
 *   the path directly if it exists.
 * - macOS: fall back to parsing the .app bundle Info.plist as before.
 * - Otherwise: attempt a few common icon paths, else return empty to let Raycast
 *   render its default icon.
 */
export function getAppIconPath(appPath: string): string {
  if (process.platform === "win32") {
    return fs.existsSync(appPath) ? appPath : "";
  }

  const plistPath = path.join(appPath, "Contents", "Info.plist");
  if (fs.existsSync(plistPath)) {
    const plistContent = fs.readFileSync(plistPath, "utf8");
    const plistData = plist.parse(plistContent);
    const iconFile = (plistData as { CFBundleIconFile?: string })?.CFBundleIconFile;
    if (iconFile) {
      const iconFileName = iconFile.endsWith(".icns") ? iconFile : `${iconFile}.icns`;
      const resourcePath = path.join(appPath, "Contents", "Resources");
      const iconPath = path.join(resourcePath, iconFileName);
      if (fs.existsSync(iconPath)) {
        return iconPath;
      }
    }
  }

  const candidatePaths = [
    appPath,
    `${appPath}.ico`,
    path.join(appPath, "Contents", "Resources", "AppIcon.icns"),
    path.join(appPath, "Contents", "Resources", "icon.icns"),
  ];

  const found = candidatePaths.find((candidate) => fs.existsSync(candidate));
  return found ?? "";
}
