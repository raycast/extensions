/** The one way commands report progress and failure: toasts with the same shape everywhere. */
import { closeMainWindow, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { isDeltaError } from "./cli";
import { DELTA_DOWNLOAD_URL, openInDelta } from "./delta";
import { getThreadDeeplink } from "./threads";
import { Thread } from "./types";

/** A failure toast that, where the fix is one step away, offers that step as its action. */
export async function showDeltaFailure(error: unknown, title: string): Promise<void> {
  if (isDeltaError(error, "not-installed")) {
    await showFailureToast(error, {
      title,
      primaryAction: { title: "Download Delta", onAction: () => open(DELTA_DOWNLOAD_URL) },
    });
  } else if (isDeltaError(error, "not-signed-in")) {
    await showFailureToast(error, {
      title,
      primaryAction: { title: "Open Delta", onAction: () => openInDelta().catch(() => undefined) },
    });
  } else {
    await showFailureToast(error, { title });
  }
}

interface ToastTitles {
  /** While the task runs, e.g. "Archiving thread". */
  progress: string;
  /** When it worked, e.g. "Thread archived". */
  success: string;
  successMessage?: string;
  /** When it didn't, e.g. "Couldn't archive thread". */
  failure: string;
}

/**
 * Runs a task behind an animated toast that turns into a success or failure toast.
 * Resolves to true when the task succeeded, so callers can continue only then.
 */
export async function runWithToast(titles: ToastTitles, task: () => Promise<unknown>): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: titles.progress });
  try {
    await task();
    toast.style = Toast.Style.Success;
    toast.title = titles.success;
    toast.message = titles.successMessage;
    return true;
  } catch (error) {
    await showDeltaFailure(error, titles.failure);
    return false;
  }
}

/** Closes Raycast and shows the thread in the Delta app. */
export async function openThreadInDelta(thread: Pick<Thread, "id">): Promise<void> {
  await closeMainWindow({ clearRootSearch: true });
  try {
    await openInDelta(getThreadDeeplink(thread));
  } catch (error) {
    await showDeltaFailure(error, "Couldn't open thread in Delta");
  }
}
