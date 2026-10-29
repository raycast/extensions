import { win32 } from "node:path";
import type { Application as NativeApplication } from "@raycast/api";
import type { AppMetadata } from "./model/input/input-models";
import type { Platform } from "./load/platform";
import { isWindowsProcessName } from "./shortcut-core/windows";

export function windowsProcessName(app: Pick<NativeApplication, "path">): string | undefined {
  if (!app.path || !/\.exe$/i.test(app.path)) return undefined;
  const name = win32.basename(app.path).replace(/\.exe$/i, "");
  return isWindowsProcessName(name) ? name : undefined;
}

export function findMatchingApps(apps: AppMetadata[], native: NativeApplication, platform: Platform): AppMetadata[] {
  if (platform === "macos") {
    return native.bundleId ? apps.filter((app) => app.bundleId === native.bundleId) : [];
  }
  const processName = windowsProcessName(native);
  const candidates = apps.filter(
    (app) => !native.windowsAppId || !app.windowsAppId || app.windowsAppId === native.windowsAppId
  );
  const exact = candidates.filter(
    (app) =>
      (native.windowsAppId && app.windowsAppId === native.windowsAppId) ||
      (processName && app.windowsProcessName?.toLowerCase() === processName.toLowerCase())
  );
  if (exact.length > 0) return exact;
  // Name matching permits discovery only. Execution still requires a verified native window.
  return candidates.filter((app) => app.name.toLowerCase() === native.name.toLowerCase());
}
