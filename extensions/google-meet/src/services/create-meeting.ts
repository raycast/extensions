import { Clipboard, getPreferenceValues, open } from "@raycast/api";
import { getAdapterForBrowser } from "../browser-adapters";
import { openInPwa } from "../browser-adapters/pwa";
import { MeetError } from "../errors";
import { runAppleScriptSafe } from "../utils/apple-script";
import { normalizeMeetingUrl } from "../utils/meeting-url";
import { getSwitchToPreviousAppScript } from "../utils/scripts";
import { getLaunchTarget, LaunchTarget, meetCreationUrl, resolveCreationBrowser, resolvePwaApp } from "./launch-target";
import { waitForMeetingUrl } from "./meeting-url-poller";

const MIN_TIMEOUT_MS = 2_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 8_000;
const POLL_INTERVAL_MS = 300;

/**
 * Reinterprets the "timeout" preference as the overall meeting-URL
 * detection deadline (previously a single fixed sleep before one lookup
 * attempt). Invalid input falls back to the default; in-range values are
 * used as-is; out-of-range values are clamped rather than rejected outright.
 */
export function getPollTimeoutMs(): number {
  const { timeout } = getPreferenceValues<Preferences>();
  const parsed = Number.parseInt(timeout, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(Math.max(parsed, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
}

export type CreateMeetingOptions = {
  /** Google account email/profile to create the meeting as (`authuser` query param). */
  profile?: string;
  /** Whether to attempt refocusing the previously active app after copying the link. */
  refocus?: boolean;
};

export type CreateMeetingResult = {
  url: string;
  target: LaunchTarget;
  /** True if `target` is `"pwa"` but opening it failed; the link was still copied successfully. */
  pwaLaunchFailed?: boolean;
};

function buildCreationUrl(profile?: string): string {
  return profile ? `${meetCreationUrl}?authuser=${encodeURIComponent(profile)}` : meetCreationUrl;
}

export async function switchToPreviousApp(): Promise<void> {
  await runAppleScriptSafe(getSwitchToPreviousAppScript());
}

/**
 * The single, shared pipeline every command uses to create a meeting: pick
 * a launch target, open the creation URL, poll for the generated link,
 * validate it, copy it, optionally open it in the PWA, and optionally
 * refocus the previous app. No polling, validation, or clipboard logic is
 * duplicated across command entrypoints.
 */
export async function createMeeting(options: CreateMeetingOptions): Promise<CreateMeetingResult> {
  const launchTarget = getLaunchTarget();

  // Resolved before touching the browser or clipboard so an unavailable PWA
  // fails fast with an actionable error instead of silently falling back to
  // browser mode.
  const pwaApp = launchTarget === "pwa" ? await resolvePwaApp() : undefined;

  const browser = await resolveCreationBrowser();
  const adapter = getAdapterForBrowser(browser.name);
  const creationUrl = buildCreationUrl(options.profile);

  const previousClipboardText = adapter.usesClipboardFallback
    ? await Clipboard.readText().catch(() => undefined)
    : undefined;

  try {
    await open(creationUrl, browser.application);

    const rawUrl = await waitForMeetingUrl(() => adapter.getCandidateUrls(), {
      timeoutMs: getPollTimeoutMs(),
      intervalMs: POLL_INTERVAL_MS,
      describeTimeout: () => adapter.describeTimeout?.() ?? Promise.resolve(undefined),
    });

    const meetingUrl = normalizeMeetingUrl(rawUrl);
    if (!meetingUrl) {
      throw new MeetError("INVALID_MEETING_URL");
    }

    try {
      await Clipboard.copy(meetingUrl);
    } catch (error) {
      throw new MeetError("CLIPBOARD_WRITE_FAILED", { cause: error });
    }

    const result: CreateMeetingResult = { url: meetingUrl, target: launchTarget };

    if (launchTarget === "pwa" && pwaApp) {
      // Best-effort: the link is already copied, so a failure here must
      // never be reported as a meeting-creation failure.
      try {
        await openInPwa(pwaApp, meetingUrl);
      } catch {
        result.pwaLaunchFailed = true;
      }
    }

    if (options.refocus) {
      // Best-effort: a refocus failure must not replace an already-successful
      // result with a failure.
      await switchToPreviousApp().catch(() => undefined);
    }

    return result;
  } catch (error) {
    if (previousClipboardText !== undefined) {
      await Clipboard.copy(previousClipboardText).catch(() => undefined);
    }
    throw error;
  }
}

export function formatSuccessMessage(result: CreateMeetingResult): string {
  if (result.target === "pwa") {
    return result.pwaLaunchFailed
      ? "Copied meet link to clipboard (couldn't open the Google Meet PWA)"
      : "Copied meet link to clipboard and opened the Google Meet PWA";
  }

  return "Copied meet link to clipboard";
}
