// Inspired in here https://github.com/raycast/extensions/blob/bbde227e17134f245eff10e59c8a7c2556da976c/extensions/quit-applications/src/index.tsx#L6

import { execSync } from "child_process";

export function applicationIconFromPath(path: string): string {
  /* Example:
   * '/Applications/Visual Studio Code.app' -> '/Applications/Visual Studio Code.app/Contents/Resources/{file name}.icns'
   */

  // read path/Contents/Info.plist and look for <key>CFBundleIconFile</key> or <key>CFBundleIconName</key>
  // the actual icon file is located at path/Contents/Resources/{file name}.icns

  const infoPlist = `${path}/Contents/Info.plist`;

  const possibleIconKeyNames = ["CFBundleIconFile", "CFBundleIconName"];

  let iconFileName = null;

  for (const keyName of possibleIconKeyNames) {
    try {
      iconFileName = execSync(["plutil", "-extract", keyName, "raw", '"' + infoPlist + '"'].join(" "))
        .toString()
        .trim();
      break;
    } catch (error) {
      continue;
    }
  }

  if (!iconFileName) {
    // no icon found. fallback to empty string (no icon)
    return "";
  }

  // if icon doesn't end with .icns, add it
  if (!iconFileName.endsWith(".icns")) {
    iconFileName = `${iconFileName}.icns`;
  }

  const iconPath = `${path}/Contents/Resources/${iconFileName}`;
  console.log(iconPath);
  return iconPath;
}
