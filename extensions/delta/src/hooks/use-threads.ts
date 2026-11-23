import { useCachedPromise } from "@raycast/utils";
import { listThreads } from "../lib/delta";
import { showDeltaFailure } from "../lib/feedback";

/**
 * All local Delta threads, cached between launches and refreshed in the background. Pass
 * `execute: false` where the list isn't needed, to skip loading it.
 */
export function useThreads({ execute = true }: { execute?: boolean } = {}) {
  return useCachedPromise(listThreads, [], {
    execute,
    onError: (error) => showDeltaFailure(error, "Couldn't load Delta threads"),
  });
}

export type ThreadsState = ReturnType<typeof useThreads>;
