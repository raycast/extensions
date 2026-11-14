import { getApplications, open } from "@raycast/api";
import type { Application } from "@raycast/api";
import { MeetError } from "../errors";

/**
 * Bundle identifier prefix Safari gives an app created with File → Add to
 * Dock (e.g. `com.apple.Safari.WebApp.<UUID>`).
 */
const SAFARI_WEB_APP_BUNDLE_ID_PREFIX = "com.apple.safari.webapp.";

/**
 * Bundle identifier prefixes browsers use when they generate a standalone
 * PWA wrapper app. Each installed PWA gets a generated identifier (e.g.
 * `com.google.Chrome.app.<hash>`), so detection can't rely on a single fixed
 * bundle ID or install path — it matches on the vendor-specific prefix instead.
 */
const PWA_BUNDLE_ID_PREFIXES = [
  SAFARI_WEB_APP_BUNDLE_ID_PREFIX,
  "com.google.chrome.app.",
  "com.microsoft.edge.app.",
  "com.brave.browser.app.",
  "com.vivaldi.vivaldi.app.",
  "company.thebrowser.arc.app.",
];

/**
 * True for a Safari web app. Unlike Chromium PWAs, its window titles can be
 * read through System Events, so a meeting can be created and detected
 * entirely inside it — see `safari-web-app.ts`.
 */
export function isSafariWebApp(app: Application): boolean {
  return app.bundleId?.toLowerCase().startsWith(SAFARI_WEB_APP_BUNDLE_ID_PREFIX) ?? false;
}

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
 * For those, meeting URLs are resolved through a real, scriptable browser
 * first (see `services/create-meeting.ts`); this function only opens that
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
