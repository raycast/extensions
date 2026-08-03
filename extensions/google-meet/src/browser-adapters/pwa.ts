import { getApplications, open } from "@raycast/api";
import type { Application } from "@raycast/api";
import { MeetError } from "../errors";

/**
 * Bundle identifier prefixes browsers use when they generate a standalone
 * PWA wrapper app. Chromium-based browsers assign each installed PWA a
 * generated identifier (e.g. `com.google.Chrome.app.<hash>`), so detection
 * can't rely on a single fixed bundle ID or install path — it matches on the
 * vendor-specific prefix instead.
 */
const PWA_BUNDLE_ID_PREFIXES = [
  "com.google.chrome.app.",
  "com.microsoft.edge.app.",
  "com.brave.browser.app.",
  "com.vivaldi.vivaldi.app.",
  "company.thebrowser.arc.app.",
];

function isLikelyMeetPwa(app: Application): boolean {
  const name = app.name.toLowerCase();
  return name === "google meet" || name === "meet";
}

/**
 * Finds the installed Google Meet PWA by searching every application
 * installed on the system (as Launch Services sees them, the same source
 * Spotlight uses) for one whose name matches Google Meet's installed PWA
 * name. A bundle-identifier prefix match is preferred when available, since
 * it's a stronger signal that the app is a real PWA wrapper rather than an
 * unrelated app that merely shares its name.
 */
export async function findGoogleMeetPwaApp(): Promise<Application> {
  const apps = await getApplications();
  const candidates = apps.filter(isLikelyMeetPwa);

  const strongMatch = candidates.find((app) =>
    PWA_BUNDLE_ID_PREFIXES.some((prefix) => app.bundleId?.toLowerCase().startsWith(prefix)),
  );

  const match = strongMatch ?? candidates[0];
  if (!match) {
    throw new MeetError("PWA_NOT_INSTALLED");
  }

  return match;
}

/**
 * Opens an already-resolved meeting URL in the PWA.
 *
 * This extension does not read the meeting URL back out of the PWA window
 * itself. Chromium/Edge/Brave PWA wrapper apps don't expose a stable,
 * cross-vendor AppleScript or Apple Events interface for reading their
 * active URL, and their generated, per-installation bundle identifiers rule
 * out scripting a single hard-coded target reliably.
 * Meeting URLs are always resolved through a real, scriptable browser first
 * (see `services/create-meeting.ts`); this function only opens that
 * already-validated URL in the PWA as a convenience, so a failure here never
 * prevents the link from being copied.
 */
export async function openInPwa(app: Application, url: string): Promise<void> {
  try {
    await open(url, app);
  } catch (error) {
    throw new MeetError("APP_LAUNCH_FAILED", { cause: error, message: `Couldn't open ${app.name}.` });
  }
}
