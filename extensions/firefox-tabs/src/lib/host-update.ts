import { Toast, showToast } from "@raycast/api";
import { CONFIG_DIR } from "./hosts";
import { join } from "path";
import {
  hostUpdateNeeded,
  outdatedHostPids,
  planHostUpdate,
  restartOutdatedHosts,
  restartableHostPids,
} from "./host-version";
import { withLock } from "./lock";
import { installNativeHost, refreshNodeSymlink } from "./installer";
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

let updating: Promise<UpdateOutcome> | null = null;

function reportRestart(toast: Toast, stopped: number) {
  toast.style = Toast.Style.Success;
  toast.title = "Firefox Bridge Updated";
  toast.message =
    stopped > 0
      ? `Version ${PINNED_HOST_VERSION}. Firefox is reconnecting; restart Firefox if tabs don't appear.`
      : `Version ${PINNED_HOST_VERSION}`;
}

/** Shared by every command, so two never install or restart the host at once. */
const UPDATE_LOCK = join(CONFIG_DIR, "update.lock");

/**
 * Run an install or update holding the cross-command lock. Resolves
 * `undefined` when another command is already doing it.
 */
export async function runLocked<T>(fn: () => Promise<T>): Promise<T | undefined> {
  const result = await withLock(UPDATE_LOCK, fn);
  return result.ran ? result.value : undefined;
}

/**
 * Keep an installed native host current when a command opens:
 * - repair the Node.js link if Raycast has moved its bundled runtime;
 * - install the pinned release over an older one;
 * - stop outdated running hosts so each Firefox profile reconnects to the
 *   new one, including when an earlier update installed the files but
 *   failed before restarting them.
 *
 * Only hosts that are running the installed bundle count, so a leftover
 * host.pid or record never makes it look as if something needs doing. Shows
 * a toast only when it changes something. `force` reinstalls even when the
 * installed version matches, for Try Again after a failed update. Resolves
 * with what happened; "busy" means another command holds the lock and is
 * doing it. Runs in this command are shared.
 */
export type UpdateOutcome = "updated" | "unchanged" | "failed" | "busy";

export function updateOutdatedHost({ force = false } = {}): Promise<UpdateOutcome> {
  const installed = installedHostVersion();
  if (installed) {
    try {
      refreshNodeSymlink();
    } catch {
      // run.sh falls back to other Node.js locations
    }
  }
  const restartable = restartableHostPids(outdatedHostPids(CONFIG_DIR, PINNED_HOST_VERSION));
  const plan = force ? "install" : planHostUpdate(installed, PINNED_HOST_VERSION, restartable);
  if (plan === "none") return Promise.resolve("unchanged");

  updating ??= runLocked(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating Firefox Bridge",
      message:
        plan === "install"
          ? `Native host ${installed ?? "(missing)"} to ${PINNED_HOST_VERSION}`
          : "Reconnecting Firefox",
    });
    if (plan === "install") {
      const ok = await installAndRegister(toast);
      if (!ok) {
        toast.primaryAction = { title: "Try Again", onAction: () => void updateOutdatedHost({ force: true }) };
        return "failed" as const;
      }
    }
    const stopped = restartOutdatedHosts(CONFIG_DIR, PINNED_HOST_VERSION);
    if (plan === "restart" && stopped === 0) {
      // The hosts exited on their own in the meantime: nothing to report.
      await toast.hide();
      return "unchanged" as const;
    }
    reportRestart(toast, stopped);
    return "updated" as const;
  })
    .then((outcome) => outcome ?? "busy")
    .finally(() => {
      updating = null;
    });
  return updating;
}
