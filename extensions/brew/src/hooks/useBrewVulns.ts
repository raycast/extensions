/**
 * Hook for the `brew vulns` security scan.
 *
 * The scan takes ~7s and does not depend on brew's index, so there is no
 * `brew update` phase and no background refresh — unlike `useBrewOutdated`.
 * The abort signal is forwarded so an unmount or a superseded revalidate kills
 * the child process instead of leaving it running.
 */

import { useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { brewFetchVulns, VulnResults, isBrewLockError, brewLogger, showBrewFailureToast } from "../utils";

export function useBrewVulns() {
  // `useCachedPromise` populates this with the controller for the in-flight
  // call and aborts it on unmount or revalidate.
  const abortable = useRef<AbortController>(null);

  const result = useCachedPromise(async (): Promise<VulnResults> => brewFetchVulns(abortable.current?.signal), [], {
    keepPreviousData: true,
    abortable,
    onError: async (error) => {
      brewLogger.error("Failed to scan for vulnerabilities", {
        errorType: error.name,
        message: error.message,
        isLockError: isBrewLockError(error),
      });

      // With nothing cached, the command renders a full-screen failure view
      // with its own Retry — a toast on top of it duplicates the message.
      if (result.data === undefined) return;

      await showBrewFailureToast("Failed to Check for Vulnerabilities", error, {
        retryAction: async () => result.revalidate(),
      });
    },
  });

  return result;
}
