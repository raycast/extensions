import type { Application } from "@raycast/api";
import type { AppItem } from "./types";

import fs from "fs";
import path from "path";

export function filterApps(apps: AppItem[]): AppItem[] {
  return apps.filter((app) => app.isSystemApp === false).sort((a, b) => a.name.localeCompare(b.name));
}

export function getIcon(app: Application): string {
  let icon = app.path + "/Contents/Resources/AppIcon.icns";

  if (!fs.existsSync(icon)) {
    const icons = fs.readdirSync(app.path + "/Contents/Resources/", { withFileTypes: true });
    const file = icons.find((file) => file.name.endsWith(".icns"));
    if (file) icon = file.path + file.name;
  }
  return icon;
}

export function isSystem(appPath: string): boolean {
  const normalizedPath = path.normalize(appPath);
  if (normalizedPath.startsWith("/System/")) return true;
  return false;
}
