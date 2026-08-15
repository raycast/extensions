/**
 * Runs an async task exactly once, tracking phase/result/error state.
 *
 * @module hooks/use-run-once
 */

import { useEffect, useRef, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { getUserFriendlyMessage } from "../lib/errors";

/** Lifecycle phase for a {@link useRunOnce} task. */
export type RunOncePhase = "running" | "complete";

/** Return value of {@link useRunOnce}. */
export type UseRunOnceResult<TResult> = {
  readonly phase: RunOncePhase;
  readonly result: TResult | undefined;
  readonly runError: string | undefined;
};

/**
 * Runs `run` exactly once (guarded against React re-renders and remounts), tracking
 * phase/result/error state and skipping state updates after unmount.
 *
 * Shared by {@link CleanupRunView} and {@link MergeRunView}, which each drive a
 * batch operation to completion and then render a results summary.
 *
 * @param run - Async task to execute once.
 * @param onSuccess - Called with the result immediately after a successful run.
 * @param errorTitle - Failure toast title shown if `run` throws.
 * @returns Current phase, result (once complete), and error message (if failed).
 */
export function useRunOnce<TResult>(
  run: () => Promise<TResult>,
  onSuccess: (result: TResult) => void | Promise<void>,
  errorTitle: string,
): UseRunOnceResult<TResult> {
  const [phase, setPhase] = useState<RunOncePhase>("running");
  const [result, setResult] = useState<TResult | undefined>();
  const [runError, setRunError] = useState<string | undefined>();
  const startedRef = useRef(false);
  const mountedRef = useRef(true);
  const runRef = useRef(run);
  const onSuccessRef = useRef(onSuccess);
  runRef.current = run;
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    void (async () => {
      try {
        const runResult = await runRef.current();
        if (!mountedRef.current) {
          return;
        }

        setResult(runResult);
        setPhase("complete");
        await onSuccessRef.current(runResult);
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        const message = getUserFriendlyMessage(error);
        setRunError(message);
        setPhase("complete");
        await showFailureToast(message, { title: errorTitle });
      }
    })();
  }, [errorTitle]);

  return { phase, result, runError };
}
