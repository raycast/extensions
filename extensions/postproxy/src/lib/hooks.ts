import { useFetch } from "@raycast/utils";
import { api, authHeaders, normalizeList } from "./postproxy";
import type { Profile, ProfileGroup } from "./types";

/**
 * Shared, cached fetch of connected profiles. `useFetch` caches per-URL within a
 * Raycast session, so every command that calls this reuses the same result.
 */
export function useProfiles() {
  return useFetch(api("/profiles"), {
    headers: authHeaders(),
    mapResult: (result: unknown) => ({ data: normalizeList<Profile>(result) }),
    keepPreviousData: true,
    initialData: [] as Profile[],
  });
}

export function useProfileGroups() {
  return useFetch(api("/profile_groups/"), {
    headers: authHeaders(),
    mapResult: (result: unknown) => ({ data: normalizeList<ProfileGroup>(result) }),
    keepPreviousData: true,
    initialData: [] as ProfileGroup[],
  });
}
