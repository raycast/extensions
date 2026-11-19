import { useCallback } from "react";
import { useCachedState } from "@raycast/utils";
import type { LaunchTarget } from "../../services/launch-target";

const cacheKey = "google-profiles";

export type GoogleProfile = {
  name: string;
  email: string;
  /**
   * Where this profile's meetings open. Absent means "follow the extension's
   * Open Meetings In preference", which is also how profiles saved before
   * this field existed behave.
   */
  launchTarget?: LaunchTarget;
};

export function useCacheHelpers() {
  const [profiles, setProfiles] = useCachedState<GoogleProfile[]>(cacheKey, []);

  const onStoreData = useCallback(
    (profile: GoogleProfile) => {
      if (profiles.find(({ email }) => email === profile.email)) {
        throw new Error();
      }

      setProfiles((prevState) => [...prevState, profile]);
    },
    [profiles, setProfiles],
  );

  const onUpdateLaunchTarget = useCallback(
    (emailToUpdate: string, launchTarget: LaunchTarget | undefined) =>
      setProfiles((prevState) =>
        prevState.map((profile) => (profile.email === emailToUpdate ? { ...profile, launchTarget } : profile)),
      ),
    [setProfiles],
  );

  const onRemoveItem = useCallback(
    (emailToDelete: string) => setProfiles((prevState) => prevState.filter(({ email }) => email !== emailToDelete)),
    [setProfiles],
  );

  return {
    profiles,
    onRemoveItem,
    onStoreData,
    onUpdateLaunchTarget,
  };
}
