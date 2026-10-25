import { Toast, showToast } from "@raycast/api";
import { CONFIG_DIR } from "./hosts";
import { hostUpdateNeeded, restartOutdatedHosts } from "./host-version";
import { installNativeHost } from "./installer";
import PINNED_HOST from "./native-host-pin.json";
import {
  generateManifest,
  installedHostVersion,
  resolveNativeHostPath,
  validateManifest,
  writeManifest,
} from "./setup";

export const PINNED_HOST_VERSION = PINNED_HOST.version;

/** Whether the installed native host is older than the one this extension pins. */
export function isHostOutdated(): boolean {
  return hostUpdateNeeded(installedHostVersion(), PINNED_HOST_VERSION);
}

/**
 * Download the native host, register it with Firefox and validate the
 * registration. Reports progress and failures in `toast`. Returns whether
 * the host is now registered.
 */
export async function installAndRegister(toast: Toast): Promise<boolean> {
  try {
    await installNativeHost((message) => {
      toast.message = message;
    });
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Installation Failed";
    toast.message = err instanceof Error ? err.message : String(err);
    return false;
  }

  let runShPath: string;
  try {
    runShPath = resolveNativeHostPath();
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Setup Failed";
    toast.message = err instanceof Error ? err.message : String(err);
    return false;
  }

  let manifestPath: string;
  try {
    manifestPath = writeManifest(generateManifest(runShPath));
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't Write Manifest";
    toast.message = "Check permissions on ~/Library/Application Support/Mozilla/";
    return false;
  }

  const validation = validateManifest(manifestPath, runShPath);
  if (!validation.valid) {
    toast.style = Toast.Style.Failure;
    toast.title = "Manifest Validation Failed";
    toast.message = validation.error ?? "Unknown validation error";
    return false;
  }
  return true;
}

let updating: Promise<boolean> | null = null;

/**
 * Update an installed native host that is older than the pinned release, with
 * a toast so the user sees it happen, then stop the outdated hosts so each
 * Firefox profile reconnects to the new one. Resolves true if it updated.
 * Concurrent calls share one update.
 */
export function updateOutdatedHost(): Promise<boolean> {
  const installed = installedHostVersion();
  if (!hostUpdateNeeded(installed, PINNED_HOST_VERSION)) return Promise.resolve(false);

  updating ??= (async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating Firefox Bridge",
      message: `Native host ${installed} to ${PINNED_HOST_VERSION}`,
    });
    const ok = await installAndRegister(toast);
    if (!ok) {
      toast.primaryAction = { title: "Try Again", onAction: () => void updateOutdatedHost() };
      return false;
    }
    const stopped = restartOutdatedHosts(CONFIG_DIR, PINNED_HOST_VERSION);
    toast.style = Toast.Style.Success;
    toast.title = "Firefox Bridge Updated";
    toast.message =
      stopped > 0
        ? `Version ${PINNED_HOST_VERSION}. Firefox is reconnecting; restart Firefox if tabs don't appear.`
        : `Version ${PINNED_HOST_VERSION}`;
    return true;
  })().finally(() => {
    updating = null;
  });
  return updating;
}
