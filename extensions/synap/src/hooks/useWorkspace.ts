import { useCachedPromise } from "@raycast/utils";
import { discover, getWorkspaces, getMe } from "../api/client";

// podKey (active pod URL) is part of the cache key so results never cross pods.

export function useWorkspaces(podKey?: string) {
  return useCachedPromise((_pod: string) => getWorkspaces(), [podKey ?? ""], { keepPreviousData: true });
}

export function useMe(podKey?: string) {
  return useCachedPromise((_pod: string) => getMe(), [podKey ?? ""], { keepPreviousData: true });
}

/**
 * Entity-type profiles for the visible schema lens. With no workspace this is
 * the pod/base schema; an explicit workspace adds only its effective overlays.
 * A role profile is an attachable facet, never a standalone entity type.
 */
export function useProfiles(workspaceId?: string, podKey?: string) {
  return useCachedPromise(
    (ws: string, _pod: string) => {
      return discover(ws ? { workspaceId: ws } : undefined).then((result) =>
        result.profiles
          .filter((profile) => (profile.profileKind ?? "kind") === "kind")
          .map((profile) => ({ ...profile, entityScope: profile.scope, properties: profile.properties ?? [] }))
      );
    },
    [workspaceId ?? "", podKey ?? ""],
    { keepPreviousData: true }
  );
}
