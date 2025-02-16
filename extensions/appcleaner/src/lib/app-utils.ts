import type { Application } from "@raycast/api";

import fs from "fs";
import path from "path";

export function filterApps(apps: Application[]): Application[] {
  return apps.filter((app) => isSystem(app.path) === false).sort((a, b) => a.name.localeCompare(b.name));
}

export function getIcon(app: Application): string {
  const icon = path.join(app.path, "Contents/Resources/AppIcon.icns");

  // default icon found
  if (fs.existsSync(icon)) return icon;

  let altIconsPath = path.join(app.path, "Contents/Resources");
  if (!fs.existsSync(altIconsPath)) altIconsPath = path.join(app.path, "Contents");
  if (!fs.existsSync(altIconsPath)) altIconsPath = app.path;
  if (!fs.existsSync(altIconsPath)) return "";

  const files = fs.readdirSync(altIconsPath, { withFileTypes: true, recursive: true });
  const icons = files.filter((file) => file.name.endsWith(".icns") || file.name.endsWith(".png"));

  const file =
    icons.find((file) => file.name.endsWith("AppIcon.icns")) ||
    icons.find((file) => file.name.toLowerCase().endsWith("app.icns")) ||
    icons.find((file) => file.name.toLowerCase().endsWith("icon.icns")) ||
    // try app_name.icns
    icons.find((file) => file.name.toLowerCase().endsWith(app.name + ".icns")) ||
    // try regex for icon*.icns
    icons.find((file) => file.name.match(/icon.*\.icns/i)) ||
    // find any icns file
    icons.find((file) => file.name.endsWith(".icns")) ||
    // try regex for *icon*.png
    icons.find((file) => file.name.match(/icon.*\.png/i)) ||
    // try regex for *logo*.png
    icons.find((file) => file.name.match(/logo.*\.png/i)) ||
    // find any png file
    icons.find((file) => file.name.endsWith(".png"));

  // found "some" icon
  if (file) return path.join(file.path, file.name);

  // couldn't find any icon
  return "";
}

export function isSystem(appPath: string): boolean {
  const normalizedPath = path.normalize(appPath);
  if (normalizedPath.startsWith("/System/")) return true;
  return false;
}
