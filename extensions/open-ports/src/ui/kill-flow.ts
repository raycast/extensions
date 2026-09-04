import { Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { UserCancelledError } from "../core/exec";
import { fetchStartTime } from "../core/ps";
import { Listener, ProcessDetails } from "../core/types";
import {
  InvalidTargetError,
  KillSignal,
  NoSuchProcessError,
  PermissionDeniedError,
  processExists,
  sendSignal,
  sendSignalAsAdmin,
} from "../core/signals";

export interface KillTarget {
  pid: number;
  name: string;
  port?: number;
  user?: string;
  /**
   * Start time captured when the list was built. PIDs are recycled, so this is compared
   * against the live process right before a signal is sent.
   */
  startedAt?: string;
}

export interface KillOptions {
  confirm: boolean;
  /** Called whenever the process table may have changed, so the list can refresh. */
  onChanged?: () => void;
}

const SIGNAL_LABEL: Record<KillSignal, string> = {
  SIGTERM: "Kill",
  SIGINT: "Interrupt",
  SIGKILL: "Force Kill",
};

/** How long a signalled process is given to unwind before it is reported as surviving. */
const EXIT_POLL_ATTEMPTS = 6;
const EXIT_POLL_INTERVAL_MS = 120;

export async function killTarget(target: KillTarget, signal: KillSignal, options: KillOptions): Promise<boolean> {
  return runKill(target, signal, options, false);
}

/** Signals through an authenticated shell, for processes owned by another user. */
export async function killTargetAsAdmin(
  target: KillTarget,
  signal: KillSignal,
  options: KillOptions,
): Promise<boolean> {
  return runKill(target, signal, options, true);
}

async function runKill(target: KillTarget, signal: KillSignal, options: KillOptions, admin: boolean): Promise<boolean> {
  if (options.confirm && !(await confirmKill(target, signal, admin))) return false;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: admin ? "Waiting for authentication…" : `Sending ${signal}…`,
    message: describe(target),
  });

  const identity = await verifyIdentity(target);
  if (identity !== "ok") {
    reportIdentityMismatch(toast, target, identity);
    options.onChanged?.();
    return identity === "gone";
  }

  try {
    if (admin) {
      await sendSignalAsAdmin(target.pid, signal, target.name);
    } else {
      await sendSignal(target.pid, signal);
    }
  } catch (error) {
    return handleSignalError(toast, error, target, signal, options, admin);
  }

  return reportOutcome(toast, target, signal, options, admin);
}

/**
 * Refuses to signal a PID that no longer belongs to the process the user selected. Without
 * this a stale list could send SIGKILL to whatever process inherited the recycled PID.
 */
async function verifyIdentity(target: KillTarget): Promise<"ok" | "gone" | "reused"> {
  if (!target.startedAt) return processExists(target.pid) ? "ok" : "gone";

  const started = await fetchStartTime(target.pid);
  if (!started) return "gone";
  return started === target.startedAt ? "ok" : "reused";
}

function reportIdentityMismatch(toast: Toast, target: KillTarget, identity: "gone" | "reused"): void {
  if (identity === "gone") {
    toast.style = Toast.Style.Success;
    toast.title = "Already gone";
    toast.message = `${target.name} (PID ${target.pid}) is no longer running`;
    return;
  }

  toast.style = Toast.Style.Failure;
  toast.title = "Nothing was killed";
  toast.message = `PID ${target.pid} now belongs to a different process. The list has been refreshed.`;
}

async function handleSignalError(
  toast: Toast,
  error: unknown,
  target: KillTarget,
  signal: KillSignal,
  options: KillOptions,
  admin: boolean,
): Promise<boolean> {
  if (error instanceof UserCancelledError) {
    toast.hide();
    return false;
  }

  if (error instanceof NoSuchProcessError) {
    toast.style = Toast.Style.Success;
    toast.title = "Already gone";
    toast.message = `No process with PID ${target.pid}`;
    options.onChanged?.();
    return true;
  }

  if (error instanceof PermissionDeniedError && !admin) {
    toast.style = Toast.Style.Failure;
    toast.title = "Permission denied";
    toast.message = `PID ${target.pid} belongs to ${target.user ?? "another user"}`;
    toast.primaryAction = {
      title: "Kill as Administrator",
      onAction: () => void killTargetAsAdmin(target, signal, { ...options, confirm: false }),
    };
    return false;
  }

  toast.style = Toast.Style.Failure;
  toast.title = error instanceof InvalidTargetError ? "Invalid target" : "Could not kill process";
  toast.message = error instanceof Error ? error.message : String(error);
  return false;
}

async function reportOutcome(
  toast: Toast,
  target: KillTarget,
  signal: KillSignal,
  options: KillOptions,
  admin: boolean,
): Promise<boolean> {
  const gone = await waitUntilGone(target.pid);
  options.onChanged?.();

  if (gone) {
    toast.style = Toast.Style.Success;
    toast.title = `Killed ${target.name}`;
    toast.message = describe(target);
    return true;
  }

  toast.style = Toast.Style.Failure;
  toast.title = `${target.name} is still running`;
  toast.message = `${signal} was delivered but PID ${target.pid} did not exit`;

  if (signal !== "SIGKILL") {
    toast.primaryAction = {
      title: "Force Kill",
      onAction: () => void killTarget(target, "SIGKILL", { ...options, confirm: false }),
    };
  } else if (!admin) {
    toast.primaryAction = {
      title: "Force Kill as Administrator",
      onAction: () => void killTargetAsAdmin(target, "SIGKILL", { ...options, confirm: false }),
    };
  }

  return false;
}

async function confirmKill(target: KillTarget, signal: KillSignal, admin: boolean): Promise<boolean> {
  const facts = [
    `PID ${target.pid}`,
    target.port === undefined ? undefined : `port ${target.port}`,
    target.user ? `user ${target.user}` : undefined,
  ].filter(Boolean);

  const consequence =
    signal === "SIGKILL"
      ? "SIGKILL terminates the process immediately. It cannot save its state or shut down cleanly."
      : `${signal} asks the process to shut down. Unsaved work may still be lost.`;

  return confirmAlert({
    icon: { source: Icon.Trash },
    title: `${SIGNAL_LABEL[signal]} "${target.name}"?`,
    message: [facts.join(" · "), consequence, admin ? "macOS will ask for your password." : undefined]
      .filter(Boolean)
      .join("\n\n"),
    primaryAction: { title: SIGNAL_LABEL[signal], style: Alert.ActionStyle.Destructive },
    dismissAction: { title: "Cancel" },
  });
}

/** A signalled process needs a moment to unwind, so its exit is polled briefly. */
async function waitUntilGone(pid: number): Promise<boolean> {
  for (let attempt = 0; attempt < EXIT_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, EXIT_POLL_INTERVAL_MS));
    if (!processExists(pid)) return true;
  }
  return false;
}

function describe(target: KillTarget): string {
  return target.port === undefined ? `PID ${target.pid}` : `PID ${target.pid} · port ${target.port}`;
}

export function killTargetForListener(listener: Listener, details?: ProcessDetails): KillTarget {
  return {
    pid: listener.pid,
    name: listener.command,
    port: listener.port,
    user: listener.user,
    startedAt: details?.started,
  };
}

export function killTargetForProcess(details: ProcessDetails, port?: number): KillTarget {
  return {
    pid: details.pid,
    name: basename(details.executable) || basename(details.commandLine) || `PID ${details.pid}`,
    port,
    user: details.user,
    startedAt: details.started,
  };
}

function basename(path: string): string {
  return path.split("/").pop()?.trim() ?? "";
}
