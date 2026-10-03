import { win32 } from "node:path";
import type { Application as NativeApplication } from "@raycast/api";
import type { AppMetadata } from "./model/input/input-models";
import type { Platform } from "./load/platform";

export function windowsProcessName(app: Pick<NativeApplication, "path">): string | undefined {
  if (!app.path || !/\.exe$/i.test(app.path)) return undefined;
  const name = win32.basename(app.path).replace(/\.exe$/i, "");
  return /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,99}$/.test(name) ? name : undefined;
}

export function findMatchingApp(
  apps: AppMetadata[],
  native: NativeApplication,
  platform: Platform
): AppMetadata | undefined {
  if (platform === "macos") return native.bundleId ? apps.find((app) => app.bundleId === native.bundleId) : undefined;
  const processName = windowsProcessName(native);
  const exact = apps.filter(
    (app) =>
      (native.windowsAppId && app.windowsAppId === native.windowsAppId) ||
      (processName && app.windowsProcessName?.toLowerCase() === processName.toLowerCase())
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return undefined;
  // Name matching permits discovery only. Execution still requires a verified native window.
  const named = apps.filter((app) => app.name.toLowerCase() === native.name.toLowerCase());
  return named.length === 1 ? named[0] : undefined;
}
