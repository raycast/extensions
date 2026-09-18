/**
 * Hook for the `brew doctor --json` health check.
 *
 * `usePromise`, not `useCachedPromise`: the run takes ~8s, and a persisted
 * cache would show findings the user has just fixed as current until the next
 * run finishes. The abort signal is forwarded so an unmount or a superseded
 * revalidate kills the child process instead of leaving it running.
 */

import { useRef } from "react";
import { Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { brewDoctor, DoctorReport, brewLogger, isBrewLockError, showBrewFailureToast } from "../utils";

export function useBrewDoctor() {
  // `usePromise` populates this with the controller for the in-flight call and
  // aborts it on unmount or revalidate.
  const abortable = useRef<AbortController>(null);

  const result = usePromise(
    async (): Promise<DoctorReport> => {
      // ~8s of silence otherwise, including on a refresh where the previous
      // report stays on screen and an in-document placeholder would never be
      // seen. Hidden only on success: Raycast's hide carries no toast id and
      // acts on whichever toast is visible (`src/utils/toast.ts`), so hiding
      // after a failure would dismiss the failure toast `onError` just raised.
      const progress = await showToast({ style: Toast.Style.Animated, title: "Running brew doctor…" });
      const report = await brewDoctor(abortable.current?.signal);
      await progress.hide();
      return report;
    },
    [],
    {
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
    },
  );

  return result;
}
