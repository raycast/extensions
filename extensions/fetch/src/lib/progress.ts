import { formatBytes, formatEta, formatSpeed } from "@chrismessina/raycast-downloader/progress";
import { showError } from "@chrismessina/raycast-kit";
import { open, showInFinder, showToast, Toast } from "@raycast/api";
import { DownloadProgress } from "./downloader";
import { logDebug } from "./logger";

const UPDATE_THROTTLE_MS = 250;
// Per-filename throttle so concurrent downloads do not clobber each other's update cadence.
const lastUpdateTimeByKey = new Map<string, number>();

/**
 * Start the progress toast for a single download.
 *
 * Deliberately a Toast rather than a HUD. `showHUD` closes the main Raycast
 * window, and `showToast` degrades to a non-interactive notification whenever the
 * window is closed — so a HUD anywhere earlier in this flow silently strips the
 * actions off the completion toast. Toasts are also Raycast's documented
 * primitive for reporting asynchronous work; HUDs are for instant confirmations.
 */
export async function showDownloadStarted(filename: string): Promise<Toast> {
  logDebug("Download toast started", { filename });
  lastUpdateTimeByKey.delete(filename);

  return showToast({
    style: Toast.Style.Animated,
    title: "Downloading",
    message: filename,
  });
}

export async function showDownloadProgress(toast: Toast, filename: string, progress: DownloadProgress): Promise<void> {
  const now = Date.now();
  const last = lastUpdateTimeByKey.get(filename) ?? 0;

  // Throttle updates to avoid flickering
  if (now - last < UPDATE_THROTTLE_MS) {
    return;
  }
  lastUpdateTimeByKey.set(filename, now);

  const percent = Math.round(progress.percent);
  let message = `${filename} — ${percent}%`;

  if (progress.speed > 0) {
    message += ` (${formatSpeed(progress.speed)})`;
  }

  if (progress.eta > 0) {
    const etaStr = formatEta(progress.eta);
    if (etaStr) {
      message += ` · ${etaStr} remaining`;
    }
  }

  logDebug("Download toast progress", { filename, percent });
  toast.message = message;
}

export async function showDownloadComplete(toast: Toast, filename: string, path: string): Promise<void> {
  logDebug("Download toast complete", { filename, path });
  lastUpdateTimeByKey.delete(filename);

  // Replace rather than mutate: flipping `style` on an already-presented toast
  // leaves the animated spinner in place, so the "finished" toast keeps spinning.
  await toast.hide();

  await showToast({
    style: Toast.Style.Success,
    title: "Download Complete",
    message: filename,
    primaryAction: {
      title: "Show in Finder",
      shortcut: { modifiers: ["cmd"], key: "return" },
      onAction: () => {
        showInFinder(path);
      },
    },
    secondaryAction: {
      title: "Open File",
      shortcut: { modifiers: ["cmd"], key: "o" },
      onAction: () => {
        open(path);
      },
    },
  });
}

export async function showDownloadError(toast: Toast, filename: string, error: string, url?: string): Promise<void> {
  logDebug("Download toast error", { filename, error });
  lastUpdateTimeByKey.delete(filename);

  await toast.hide();

  await showError(new Error(error), {
    title: "Download Failed",
    message: `${filename}: ${error}`,
    copyContext: url,
  });
}

export async function showValidationError(message: string): Promise<void> {
  logDebug("Validation error", { message });

  await showError(new Error(message), { title: "Invalid URL" });
}

// Re-exported so views keep importing formatters from one place.
export { formatBytes, formatEta, formatSpeed };
