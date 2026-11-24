import { ChromeAction, openGoogleChrome } from "../util/chrome";
import { loadVisibleProfiles } from "../util/profiles";
import { getSelectedBrowser } from "../util/types";
import { isValidUrl } from "../util/util";

type Input = {
  /** The directory ID returned by List Profiles. */
  directory: string;
  /** An absolute HTTP or HTTPS URL. Omit to bring the profile to the front. */
  url?: string;
};

export default async function openProfile({ directory, url }: Input) {
  const targetUrl = url?.trim();
  if (url !== undefined && (!targetUrl || !/^https?:\/\//i.test(targetUrl) || !isValidUrl(targetUrl))) {
    throw new Error("Provide an absolute HTTP or HTTPS URL.");
  }

  const browser = getSelectedBrowser();
  const profiles = await loadVisibleProfiles(browser);
  const profile = profiles.find((item) => item.directory === directory);
  if (!profile) throw new Error("Profile unavailable. Run List Profiles to get a visible profile's directory ID.");

  const target = targetUrl ? ChromeAction.openUrl(targetUrl) : ChromeAction.Focus;
  if (!(await openGoogleChrome(profile, target, async () => undefined, browser))) {
    throw new Error(`Could not open the "${profile.name}" profile in ${browser.appName}.`);
  }

  return targetUrl ? { profile: profile.name, url: targetUrl } : { profile: profile.name };
}
