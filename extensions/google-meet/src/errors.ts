import { showToast, Toast } from "@raycast/api";

/**
 * Every way meeting creation can fail. Kept specific so a failure after the
 * link is already on the clipboard (e.g. refocus, or opening the PWA) is
 * never confused with a failure that means nothing was copied.
 */
export type MeetErrorCode =
  | "APP_NOT_FOUND"
  | "APP_LAUNCH_FAILED"
  | "UNSUPPORTED_BROWSER"
  | "URL_READ_PERMISSION_DENIED"
  | "URL_READ_FAILED"
  | "MEETING_URL_TIMEOUT"
  | "INVALID_MEETING_URL"
  | "CLIPBOARD_WRITE_FAILED"
  | "PWA_NOT_INSTALLED"
  | "ARC_URL_UNREADABLE";

const DEFAULT_MESSAGES: Record<MeetErrorCode, string> = {
  APP_NOT_FOUND: "Couldn't find the selected application.",
  APP_LAUNCH_FAILED: "The application couldn't be launched.",
  UNSUPPORTED_BROWSER: "That browser isn't supported yet.",
  URL_READ_PERMISSION_DENIED: "Raycast isn't allowed to read the browser's address bar.",
  URL_READ_FAILED: "Couldn't read the meeting URL from the browser.",
  MEETING_URL_TIMEOUT: "Timed out waiting for Google Meet to generate a link.",
  INVALID_MEETING_URL: "The detected URL didn't look like a real Google Meet link.",
  CLIPBOARD_WRITE_FAILED: "Couldn't copy the link to the clipboard.",
  PWA_NOT_INSTALLED: "The Google Meet PWA isn't installed.",
  ARC_URL_UNREADABLE: "Couldn't read the meeting link from any Arc window.",
};

const DEFAULT_RECOVERY: Partial<Record<MeetErrorCode, string>> = {
  UNSUPPORTED_BROWSER: "Choose a supported browser in the extension preferences, or set a preferred browser.",
  URL_READ_PERMISSION_DENIED:
    "Grant Raycast Automation permission for your browser (and Accessibility permission for Firefox) in System Settings → Privacy & Security, then try again.",
  MEETING_URL_TIMEOUT: "Try again, or increase the detection timeout in the extension preferences.",
  PWA_NOT_INSTALLED: 'Install the Google Meet PWA, or switch "Open Meetings In" back to Browser.',
  ARC_URL_UNREADABLE:
    "A Little Arc window doesn't expose its URL to Raycast, so if Air Traffic Control routed the meeting into one, disable it for meet.google.com. Otherwise copy the link from Arc manually.",
};

export type MeetErrorOptions = {
  message?: string;
  recovery?: string;
  cause?: unknown;
};

export class MeetError extends Error {
  readonly code: MeetErrorCode;
  readonly recovery?: string;
  readonly cause?: unknown;

  constructor(code: MeetErrorCode, options: MeetErrorOptions = {}) {
    super(options.message ?? DEFAULT_MESSAGES[code]);
    this.name = "MeetError";
    this.code = code;
    this.recovery = options.recovery ?? DEFAULT_RECOVERY[code];
    this.cause = options.cause;
  }
}

export function isMeetError(error: unknown): error is MeetError {
  return error instanceof MeetError;
}

/**
 * Renders a failure as a Raycast toast. Centralized here so every command
 * and the profile list surface identical, actionable messaging instead of
 * each re-deriving it (and so a raw AppleScript error never becomes the
 * headline message — it's still logged for development, just not shown).
 */
export async function reportMeetFailure(error: unknown, context: string): Promise<void> {
  console.error(`[google-meet] ${context} failed:`, error);

  if (isMeetError(error)) {
    await showToast({
      style: Toast.Style.Failure,
      title: error.message,
      message: error.recovery,
    });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "Something went wrong creating the meeting.",
    message: error instanceof Error ? error.message : undefined,
  });
}
