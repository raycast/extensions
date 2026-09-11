import { useCachedPromise } from "@raycast/utils";
import { useCallback } from "react";
import { loadSnapshot } from "./appfreezer";
import { AgentSnapshot } from "./protocol";

export function useAgentSnapshot() {
  const { data, error, isLoading, revalidate, mutate } = useCachedPromise(loadSnapshot, [], {
    onError() {
      // Surface failures in List.EmptyView instead of a duplicate toast.
    },
  });

  const applySnapshot = useCallback(
    async (update: Promise<AgentSnapshot>): Promise<AgentSnapshot> => {
      const next = await update;
      await mutate(undefined, {
        optimisticUpdate: () => next,
        shouldRevalidateAfter: false,
      });
      return next;
    },
    [mutate],
  );

  return {
    snapshot: data,
    error,
    isLoading,
    revalidate,
    applySnapshot,
  };
}
