import path from "path";
import fs from "fs";
import plist from "plist";

/**
 * Retrieves the file path of the application icon from a given macOS application bundle.
 *
 * @param {string} appPath - The absolute path to the `.app` bundle of the macOS application.
 * @returns {string} - The absolute path to the application's icon file, typically with a `.icns` extension.
 *
 * @example
 * const iconPath = getAppIconPath("/Applications/Safari.app");
 * console.log(iconPath);
 * // Outputs: "/Applications/Safari.app/Contents/Resources/compass.icns"
 */
export function getAppIconPath(appPath: string): string {
  const plistPath = path.join(appPath, "Contents", "Info.plist");
  if (!fs.existsSync(plistPath)) {
    throw new Error("Info.plist file not found");
  }

  const plistContent = fs.readFileSync(plistPath, "utf8");
  const plistData = plist.parse(plistContent);
  const iconFile = (plistData as { CFBundleIconFile: string })?.CFBundleIconFile;
  if (!iconFile) {
    throw new Error("CFBundleIconFile key not found in Info.plist");
  }

  const iconFileName = iconFile.endsWith(".icns") ? iconFile : `${iconFile}.icns`;
  const resourcePath = path.join(appPath, "Contents", "Resources");
  const iconPath = path.join(resourcePath, iconFileName);

  if (!fs.existsSync(iconPath)) {
    throw new Error(`Icon file not found: ${iconPath}`);
  }
  return iconPath;
}
