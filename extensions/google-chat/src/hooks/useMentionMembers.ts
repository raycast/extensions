import { useCachedPromise } from "@raycast/utils";

import { loadMentionMembers } from "../api/spaces";
import type { SpaceType } from "../api/types";

function load(spaceName: string, spaceType: SpaceType | undefined) {
  return loadMentionMembers({ name: spaceName, spaceType });
}

/**
 * Members who can be @mentioned in a space, loaded once a space is chosen (cached per space).
 * Failures leave the list empty.
 */
export function useMentionMembers(spaceName: string | undefined, spaceType: SpaceType | undefined) {
  const enabled = !!spaceName;
  const { data, isLoading } = useCachedPromise(load, [spaceName ?? "", spaceType], {
    execute: enabled,
    onError: (error) => console.error("Could not load members to mention", error),
  });
  return { members: enabled ? (data ?? []) : [], isLoading: enabled && isLoading };
}
