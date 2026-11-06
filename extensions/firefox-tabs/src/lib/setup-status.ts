import { readHosts } from "./hosts";
import { type ProfileStatus, findRunningProfiles, profileStatuses } from "./profile-status";
import { type FirefoxProfile, loadProfiles } from "./profiles";

/**
 * Load every Firefox profile with its setup state, along with the full
 * profile list (for consistent colours and avatars).
 */
export async function loadProfileStatuses(): Promise<{ profiles: FirefoxProfile[]; statuses: ProfileStatus[] }> {
  const [profiles, running] = await Promise.all([loadProfiles(), findRunningProfiles()]);
  const statuses = profileStatuses(
    profiles,
    running,
    readHosts().map((h) => h.profilePath)
  );
  return { profiles, statuses };
}
