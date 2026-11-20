import { logger } from "@chrismessina/raycast-logger";
import { failToast as kitFailToast, getErrorMessage, showError } from "@chrismessina/raycast-kit";
import { Clipboard, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { DayOneCliError } from "./cli";
import { plural, SyncProgress } from "./parse";
import { syncAfterWrite, syncAndWait, SyncSummary } from "./sync";

export const errorMessage = getErrorMessage;

const log = logger.child("[ui]");

/** What to run in Terminal when the CLI needs keychain approval it can't ask for from Raycast. */
export const KEYCHAIN_COMMAND = "dayone sync";

/** What the user can do about a CLI failure, in one sentence. */
export function errorHint(error: unknown): string | undefined {
  if (!(error instanceof DayOneCliError)) return undefined;
  switch (error.kind) {
    case "not-installed":
    case "outdated":
      return "Run Doctor to install the Day One CLI.";
    case "auth":
      return "Run Doctor to sign in.";
    case "encryption-key":
      return "Run Doctor to add your encryption key.";
    case "keychain":
      return "Run `dayone sync` once in Terminal and choose Always Allow.";
    case "search-model":
      return "Run Doctor to download the search model.";
    default:
      return undefined;
  }
}

export async function openDoctor(): Promise<void> {
  try {
    await launchCommand({ name: "doctor", type: LaunchType.UserInitiated });
  } catch (error) {
    await failToast(error, "Couldn't Run Doctor");
  }
}

/** The first line of a CLI error, which is the readable part; Copy Error still gets all of it. */
function shortMessage(message: string): string {
  const first = message.split("\n")[0].trim();
  return first.length > 120 ? `${first.slice(0, 119)}…` : first;
}

/** The fix for a setup problem, as a toast action: copy the Terminal command, or open Run Doctor. */
function fixAction(error: unknown): Toast.ActionOptions | undefined {
  if (error instanceof DayOneCliError && error.kind === "keychain") {
    return { title: "Copy Terminal Command", onAction: () => Clipboard.copy(KEYCHAIN_COMMAND) };
  }
  return errorHint(error) ? { title: "Run Doctor", onAction: openDoctor } : undefined;
}

/** Turns `toast` (or a new toast) into a failure with Copy Error, plus the fix when there is one. */
export async function failToast(error: unknown, title: string, toast?: Toast): Promise<void> {
  // CLI errors carry no entry text or credentials; the logger redacts anything that looks like an email or token.
  log.error(title, { kind: error instanceof DayOneCliError ? error.kind : undefined, message: errorMessage(error) });
  const options = {
    title,
    message: errorHint(error) ?? shortMessage(errorMessage(error)),
    action: fixAction(error),
    // The message above is shortened or replaced, so the full CLI text rides along on Copy Error.
    copyContext: errorMessage(error),
  };
  if (toast) kitFailToast(toast, error, options);
  else await showError(error, options);
}

/** `onError` for usePromise/useCachedPromise, so hook failures carry Copy Error. Setup problems get an empty view instead. */
export function onErrorToast(title: string) {
  return (error: unknown) => {
    if (!needsSetup(error)) void failToast(error, title);
  };
}

/** True when the extension can't work until the user fixes setup in Run Doctor. */
export function needsSetup(error: unknown): boolean {
  return errorHint(error) !== undefined;
}

export function progressMessage(progress: SyncProgress): string {
  if (progress.entries === 0) return progress.journalsStarted ? "Checking journals…" : "Checking for changes…";
  return `${plural(progress.entries, "entry", "entries")} downloaded`;
}

export function summaryMessage(summary: SyncSummary): string {
  if (summary.alreadyRunning) return "Another sync was running, so this one was skipped";
  const parts = [];
  if (summary.downloaded) parts.push(`${plural(summary.downloaded, "entry", "entries")} downloaded`);
  if (summary.uploaded) parts.push(`${plural(summary.uploaded, "entry", "entries")} uploaded`);
  if (summary.failedResources) parts.push(`${plural(summary.failedResources, "item")} failed`);
  return parts.length ? parts.join(" · ") : "No changes";
}

/**
 * After a local write: keeps `toast` animated as "Uploading to Day One…", then shows `saved` as the one success. The
 * upload is a full sync (CLI 0.22.1 has no upload-only option, Automattic/DayOne-Cli#56), so it takes seconds. If it
 * fails, the write is still safe and the next sync retries it, so the failure says so. Returns null when it failed.
 */
export async function uploadAfterSaving(toast: Toast, saved: string): Promise<SyncSummary | null> {
  toast.style = Toast.Style.Animated;
  toast.title = "Uploading to Day One…";
  toast.message = undefined;
  try {
    const summary = await syncAfterWrite();
    if (summary.failedResources) throw new Error("Day One didn't accept every change");
    toast.style = Toast.Style.Success;
    toast.title = saved;
    // A sync started elsewhere (Terminal, background sync) held the lock, so this upload waits for the next one.
    toast.message = summary.alreadyRunning
      ? "Another sync was running; it uploads on the next sync"
      : "Uploaded to Day One";
    return summary;
  } catch (error) {
    log.error("upload failed", { message: errorMessage(error) });
    kitFailToast(toast, error, {
      title: `${saved}, Not Uploaded Yet`,
      message: "The next sync retries the upload",
      action: { title: "Run Doctor", onAction: openDoctor },
      copyContext: errorMessage(error),
    });
    return null;
  }
}

/** Runs a sync behind one toast: animated with a running count, then success or failure in place. */
export async function syncWithToast(options: { title?: string } = {}): Promise<SyncSummary | null> {
  const toast = await showToast({ style: Toast.Style.Animated, title: options.title ?? "Syncing Day One…" });
  log.debug("sync requested", { title: toast.title });
  try {
    const summary = await syncAndWait((progress) => {
      toast.message = progressMessage(progress);
    });
    toast.style = summary.failedResources ? Toast.Style.Failure : Toast.Style.Success;
    toast.title = summary.failedResources
      ? "Sync Finished with Problems"
      : summary.alreadyRunning
        ? "Day One Is Already Syncing"
        : "Day One Is Up to Date";
    toast.message = summaryMessage(summary);
    if (summary.failedResources) {
      kitFailToast(toast, new Error(summaryMessage(summary)), {
        title: "Sync Finished with Problems",
        action: { title: "Run Doctor", onAction: openDoctor },
      });
    }
    return summary;
  } catch (error) {
    await failToast(error, "Sync Failed", toast);
    return null;
  }
}
