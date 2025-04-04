import { useCachedPromise } from "@raycast/utils";
import { getMember } from "../api";
import { ErrorWithStatus, getPinned, removePinned } from "../utils";

export function usePinnedMembers(key: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    async (key) => {
      const pinnedMembers = await getPinned(key);
      const members = await Promise.all(
        pinnedMembers.map(async (pinned) => {
          try {
            const response = await getMember(pinned.spaceId, pinned.objectId);
            return response.member;
          } catch (error) {
            const typedError = error as ErrorWithStatus;
            if (typedError.status === 404 || typedError.status === 410) {
              await removePinned(pinned.spaceId, pinned.objectId, key);
            }
            return null;
          }
        }),
      );
      return members.filter((member) => member !== null);
    },
    [key],
    {
      keepPreviousData: true,
    },
  );

  return {
    pinnedMembers: data,
    pinnedMembersError: error,
    isLoadingPinnedMembers: isLoading,
    mutatePinnedMembers: mutate,
  };
}
