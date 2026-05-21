import { open, showToast, Toast } from "@raycast/api";

/**
 * Deep link to System Settings ▸ Privacy & Security ▸ Screen Recording.
 * Works on macOS 13–26 (the pane id has been stable across versions).
 */
export const SCREEN_RECORDING_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

/** The user dismissed the screenshot selection (Esc / click without dragging). Not a failure. */
export class OcrCancelledError extends Error {
  readonly kind = "cancelled" as const;

  constructor() {
    super("Screenshot cancelled");
    this.name = "OcrCancelledError";
  }
}

/**
 * screencapture exited 0 but the file is not a decodable image. Common causes,
 * in rough order: the selection was dismissed/empty, a transient capture
 * failure, or a missing Screen Recording grant. We surface all of them rather
 * than asserting one — and carry a diagnostic detail for the next report.
 */
export class ScreenRecordingPermissionError extends Error {
  readonly kind = "permission" as const;
  readonly detail?: string;

  constructor(detail?: string) {
    super("The captured screenshot could not be read as an image.");
    this.name = "ScreenRecordingPermissionError";
    this.detail = detail?.trim() || undefined;
  }
}

/** Any other OCR failure, carrying a cleaned, human-readable message. */
export class OcrError extends Error {
  readonly kind = "error" as const;

  constructor(message: string) {
    super(message.trim() || "OCR failed unexpectedly. Try retaking the screenshot.");
    this.name = "OcrError";
  }
}

export interface OcrErrorDescription {
  title: string;
  message: string;
  isCancelled: boolean;
  isPermission: boolean;
}

/**
 * Map any thrown value to a stable title/message pair so the UI never shows an
 * empty toast and the user always gets one actionable next step.
 */
export function describeOcrError(error: unknown): OcrErrorDescription {
  if (error instanceof OcrCancelledError || looksCancelled(error)) {
    return { title: "Screenshot cancelled", message: "", isCancelled: true, isPermission: false };
  }

  if (error instanceof ScreenRecordingPermissionError || looksLikeUnreadableCapture(error)) {
    const detail = error instanceof ScreenRecordingPermissionError ? error.detail : undefined;
    return {
      title: "Couldn't read the screenshot",
      message: [
        "Choose Retake Screenshot to try again.",
        "If it keeps failing, check Raycast under System Settings ▸ Privacy & Security ▸ Screen Recording (then fully quit and reopen Raycast).",
        detail ? `[${detail}]` : "",
      ]
        .filter(Boolean)
        .join(" "),
      isCancelled: false,
      isPermission: true,
    };
  }

  return {
    title: "OCR Failed",
    message: cleanMessage(error instanceof Error ? error.message : String(error)),
    isCancelled: false,
    isPermission: false,
  };
}

export async function openScreenRecordingSettings(): Promise<void> {
  await open(SCREEN_RECORDING_SETTINGS_URL);
}

/** Show the right toast for an OCR error; returns the description for further UI use. */
export async function reportOcrError(error: unknown): Promise<OcrErrorDescription> {
  const description = describeOcrError(error);

  if (description.isCancelled) {
    return description;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: description.title,
    message: description.message,
    primaryAction: description.isPermission
      ? { title: "Open Screen Recording Settings", onAction: () => void openScreenRecordingSettings() }
      : undefined,
  });

  return description;
}

function looksCancelled(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return message.includes("cancel");
}

function looksLikeUnreadableCapture(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return /failed to (read|convert) image|not a valid image|invalid screenshot/.test(message);
}

function cleanMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "Unexpected error. Try retaking the screenshot.";
  }

  // Strip the noisy `Command failed: /path/to/recognizeText /tmp/xxx.png` prefix
  // that execFile prepends, keeping the real diagnostic line if present.
  const withoutCommand = trimmed
    .replace(/^command failed:.*$/im, "")
    .replace(/^error:\s*/im, "")
    .trim();

  const firstMeaningfulLine = withoutCommand
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return (firstMeaningfulLine ?? trimmed).slice(0, 200);
}
