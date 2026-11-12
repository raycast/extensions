import { useCachedPromise } from "@raycast/utils";
import { listThreads } from "../lib/delta";
import { showDeltaFailure } from "../lib/feedback";

/** All local Delta threads, cached between launches and refreshed in the background. */
export function useThreads() {
  return useCachedPromise(listThreads, [], {
    onError: (error) => showDeltaFailure(error, "Couldn't load Delta threads"),
  });
}

export type ThreadsState = ReturnType<typeof useThreads>;
