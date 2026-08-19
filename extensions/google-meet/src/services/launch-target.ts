import { getDefaultApplication, getPreferenceValues } from "@raycast/api";
import type { Application } from "@raycast/api";
import { findGoogleMeetPwaApp } from "../browser-adapters/pwa";
import { MeetError } from "../errors";
import { supportedBrowsers } from "../utils/scripts";
import type { SupportedBrowsers } from "../utils/scripts";

export type LaunchTarget = "browser" | "pwa";

export const meetCreationUrl = "https://meet.google.com/new";

function isSupportedBrowserName(name: string): name is SupportedBrowsers {
  return (supportedBrowsers as readonly string[]).includes(name);
}

export function getLaunchTarget(): LaunchTarget {
  const { launchTarget } = getPreferenceValues<Preferences>();
  return launchTarget === "pwa" ? "pwa" : "browser";
}

/**
 * A resolved browser, carrying both identities it's needed under:
 *
 * - `application` launches it. Passing the resolved application rather than
 *   its display name means the exact bundle is opened; a name has to be
 *   matched back to an app, and short browser names are substrings of
 *   unrelated apps (`Dia` matches `Obsidian`), which opens the wrong one.
 * - `name` scripts it. AppleScript addresses an app by the name macOS
 *   installs it under (`tell application "Brave Browser"`), and the adapter
 *   for a browser family is selected from that same name.
 */
export type CreationBrowser = {
  application: Application;
  name: SupportedBrowsers;
};

/**
 * Determines which real, scriptable browser should open the meeting
 * creation URL. Used for both launch targets: even in PWA mode the meeting
 * is created and its URL is read through a real browser first, since PWA
 * wrapper apps aren't reliably scriptable — see `browser-adapters/pwa.ts`.
 */
export async function resolveCreationBrowser(): Promise<CreationBrowser> {
  const { preferredBrowser } = getPreferenceValues<Preferences>();
  if (preferredBrowser?.name && isSupportedBrowserName(preferredBrowser.name)) {
    return { application: preferredBrowser, name: preferredBrowser.name };
  }

  const defaultApplication = await getDefaultApplication(meetCreationUrl);
  if (isSupportedBrowserName(defaultApplication.name)) {
    return { application: defaultApplication, name: defaultApplication.name };
  }

  throw new MeetError("UNSUPPORTED_BROWSER", {
    message: `"${defaultApplication.name}" isn't a supported browser.`,
  });
}

export async function resolvePwaApp(): Promise<Application> {
  return findGoogleMeetPwaApp();
}
