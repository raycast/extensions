/**
 * Hook for the `brew doctor --json` health check.
 *
 * `usePromise`, not `useCachedPromise`: the run takes ~8s, and a persisted
 * cache would show findings the user has just fixed as current until the next
 * run finishes. The abort signal is forwarded so an unmount or a superseded
 * revalidate kills the child process instead of leaving it running.
 */

import { useRef } from "react";
import { usePromise } from "@raycast/utils";
import { brewDoctor, DoctorReport, brewLogger, isBrewLockError, showBrewFailureToast } from "../utils";

export function useBrewDoctor() {
  // `usePromise` populates this with the controller for the in-flight call and
  // aborts it on unmount or revalidate.
  const abortable = useRef<AbortController>(null);

  const result = usePromise(async (): Promise<DoctorReport> => brewDoctor(abortable.current?.signal), [], {
    abortable,
    onError: async (error) => {
      brewLogger.error("brew doctor failed", {
        errorType: error.name,
        message: error.message,
        isLockError: isBrewLockError(error),
      });
      await showBrewFailureToast("Doctor Failed", error, {
        retryAction: async () => {
          result.revalidate();
        },
      });
    },
  });

  return result;
}
