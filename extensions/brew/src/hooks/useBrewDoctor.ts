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
import { brewDoctor, DoctorReport, brewLogger, isAbortError, isBrewLockError, showBrewFailureToast } from "../utils";

export function useBrewDoctor() {
  // `usePromise` populates this with the controller for the in-flight call and
  // aborts it on unmount or revalidate.
  const abortable = useRef<AbortController>(null);
  // Which run owns the progress toast — see the same guard in
  // `useDryRunPreview`. `usePromise` supersedes a run by aborting it and
  // starting the next one without waiting for the old to settle, and Raycast's
  // hide acts on whatever toast is visible rather than on ours.
  const toastRun = useRef(0);

  const result = usePromise(
    async (): Promise<DoctorReport> => {
      // ~8s of silence otherwise, including on a refresh where the previous
      // report stays on screen and an in-document placeholder would never be
      // seen. Raycast's hide carries no toast id and acts on whichever toast is
      // visible (`src/utils/toast.ts`), so the hides below are guarded on both
      // WHEN they fire — never after a real failure, whose own toast must keep
      // the slot — and WHETHER this run still owns the toast.
      const mine = ++toastRun.current;
      // Best-effort and never awaited into the result: a hide that rejects must
      // not turn a finished report into "Doctor Failed".
      const clearProgress = (toast: Toast) => {
        if (toastRun.current !== mine) return; // superseded — not our toast any more
        toast.hide().catch((hideErr) => brewLogger.log("Failed to hide doctor progress toast", hideErr));
      };

      const progress = await showToast({ style: Toast.Style.Animated, title: "Running brew doctor…" });
      try {
        const report = await brewDoctor(abortable.current?.signal);
        clearProgress(progress);
        return report;
      } catch (err) {
        // An unmount or a superseded revalidate aborts the run, and an abort
        // raises no toast of its own — `showBrewFailureToast` returns early on
        // one and `usePromise` suppresses `onError` for it — so this toast must
        // clear itself. A real failure is left alone: `onError` puts a failure
        // toast up, and hiding here would dismiss that instead.
        if (isAbortError(err)) clearProgress(progress);
        throw err;
      }
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
