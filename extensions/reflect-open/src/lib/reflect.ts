import { Application, getApplications, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CaptureInboxError, MAX_CAPTURE_LENGTH, spoolTextCapture } from "./capture-inbox";

/**
 * Reflect Open has no cloud API. Text captures use the app's local capture
 * inbox (`.reflect/inbox/`), the same audited queue its deep links drain into:
 *
 *   kind: append   → a bullet on the capture-day daily note
 *   kind: task     → an open task on the capture-day daily note
 *
 * The payload is folded to a single line and capped at 10k characters.
 * Writing the envelope directly to that inbox keeps Reflect closed and out of
 * the way. If the app is running, its watcher drains the capture quietly. If
 * it is closed, the capture waits safely until the next launch.
 */

export const REFLECT_OPEN_RELEASES_URL = "https://github.com/team-reflect/reflect-open/releases/latest";

/**
 * Reflect Open desktop bundle ids: `app.reflect.desktop` (stable),
 * `app.reflect.desktop.beta`, `app.reflect.desktop.dev`. The legacy cloud
 * Reflect has a similar display name but a different bundle id, so checking
 * this prefix confirms the local Reflect Open app is actually installed.
 */
const REFLECT_OPEN_BUNDLE_PREFIX = "app.reflect.desktop";

export type TimestampFormat = "12" | "24";

export interface CaptureOptions {
  /** Capture an open task instead of a plain bullet. */
  isTask?: boolean;
  /** Prefix the line with the current time. */
  prependTimestamp?: boolean;
  /** 12- or 24-hour clock for the prepended time. Defaults to 12-hour. */
  timestampFormat?: TimestampFormat;
}

export function formatTimestamp(format: TimestampFormat = "12", date: Date = new Date()): string {
  return format === "24"
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Fold to one line (the app does this too) and apply the optional timestamp. */
export function buildCaptureText(text: string, options: CaptureOptions = {}): string {
  const folded = text.replace(/\s+/g, " ").trim();
  if (folded === "" || !options.prependTimestamp) {
    return folded;
  }
  return `${formatTimestamp(options.timestampFormat)}: ${folded}`;
}

/** The installed Reflect Open app (stable preferred over beta/dev), if any. */
export async function findReflectOpenApp(): Promise<Application | undefined> {
  const apps = await getApplications();
  const matches = apps.filter((app) => app.bundleId?.startsWith(REFLECT_OPEN_BUNDLE_PREFIX));
  return matches.find((app) => app.bundleId === REFLECT_OPEN_BUNDLE_PREFIX) ?? matches[0];
}

/**
 * Queue one line for the capture-day daily note without launching or focusing
 * Reflect Open. Returns true when the capture is safely in the inbox, false
 * (after surfacing a toast) when validation or the local queue fails.
 */
export async function captureToDailyNote(rawText: string, options: CaptureOptions = {}): Promise<boolean> {
  const body = buildCaptureText(rawText, options);

  if (body === "") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to append",
      message: "Enter some text first.",
    });
    return false;
  }

  if (body.length > MAX_CAPTURE_LENGTH) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Text too long",
      message: `Reflect Open caps a capture at ${MAX_CAPTURE_LENGTH.toLocaleString()} characters.`,
    });
    return false;
  }

  const installedApp = await findReflectOpenApp();
  if (!installedApp) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Reflect Open not found",
      message: "Install the Reflect Open desktop app to capture notes.",
      primaryAction: {
        title: "Get Reflect Open",
        onAction: (toast) => {
          open(REFLECT_OPEN_RELEASES_URL);
          toast.hide();
        },
      },
    });
    return false;
  }

  try {
    await spoolTextCapture(body, options.isTask ? "task" : "append");
    return true;
  } catch (error) {
    if (error instanceof CaptureInboxError && error.code === "no-graph") {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Reflect graph selected",
        message: "Open Reflect once and select your graph. After that it can stay closed.",
      });
      return false;
    }
    await showFailureToast(error, { title: "Couldn't queue the thought" });
    return false;
  }
}
