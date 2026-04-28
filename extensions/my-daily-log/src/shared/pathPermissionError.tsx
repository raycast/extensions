import { showToast, Toast, openExtensionPreferences } from "@raycast/api";

export function isPathPermissionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as NodeJS.ErrnoException).code;
  return code === "EPERM" || code === "EACCES";
}

export function showPathPermissionToast(path: string): void {
  showToast({
    style: Toast.Style.Failure,
    title: "Can't access Daily Log folder",
    message: `macOS blocked access to ${path}. Grant Raycast Full Disk Access in System Settings → Privacy & Security, or change the Daily Log Path preference.`,
    primaryAction: {
      title: "Open Extension Preferences",
      onAction: () => openExtensionPreferences(),
    },
  }).catch(() => undefined);
}

export function runWithPathPermissionToast<T>(path: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (isPathPermissionError(error)) {
      showPathPermissionToast(path);
    }
    throw error;
  }
}

export function runWithPathPermissionFallback<T>(path: string, fallback: T, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (isPathPermissionError(error)) {
      showPathPermissionToast(path);
      return fallback;
    }
    throw error;
  }
}
