import { Cache, getPreferenceValues } from "@raycast/api";
import { openNewTab } from "../actions";
import { BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID } from "../constants";

export async function launchBrowserCommand(options: { newWindow?: boolean; incognito?: boolean } = {}) {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  let profileCurrent = DEFAULT_BRAVE_PROFILE_ID;
  try {
    const cached = new Cache().get(BRAVE_PROFILE_KEY);
    const profile: unknown = cached ? JSON.parse(cached) : undefined;
    if (typeof profile === "string" && profile) profileCurrent = profile;
  } catch {
    profileCurrent = DEFAULT_BRAVE_PROFILE_ID;
  }
  await openNewTab({
    profileCurrent,
    profileOriginal: profileCurrent,
    openTabInProfile,
    ...options,
    url: options.newWindow && !options.incognito ? "brave://newtab/" : undefined,
  });
}
