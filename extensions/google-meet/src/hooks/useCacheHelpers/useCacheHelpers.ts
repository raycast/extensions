import { useCallback } from "react";
import { useCachedState } from "@raycast/utils";

const cacheKey = "google-profiles";

export type GoogleProfile = {
  name: string;
  email: string;
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

  const onRemoveItem = useCallback(
    (emailToDelete: string) => setProfiles((prevState) => prevState.filter(({ email }) => email !== emailToDelete)),
    [setProfiles],
  );

  return {
    profiles,
    onRemoveItem,
    onStoreData,
  };
}
