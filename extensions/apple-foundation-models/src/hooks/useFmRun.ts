import { environment } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { FmError } from "../lib/errors";
import { RunOptions } from "../lib/fm";

/** A request to the model. It must pass `runOptions` on to `fm` so it can stream and be stopped. */
export type FmTask = (runOptions: RunOptions) => Promise<string>;

/**
 * Runs one model request at a time and streams its answer into state. A new request, `stop()` or
 * closing the view kills the running `fm` process, so no process is left behind.
 */
export function useFmRun() {
  const [text, setText] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<FmError>();
  const [wasStopped, setWasStopped] = useState(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (!environment.isDevelopment) {
        controller.current?.abort();
        return;
      }
      // React runs effects twice in development. Only stop the request when the view really closed.
      setTimeout(() => {
        if (!isMounted.current) controller.current?.abort();
      }, 0);
    };
  }, []);

  const run = useCallback(async (task: FmTask): Promise<string | undefined> => {
    // Nothing starts after the view has closed, for example a waiting chat message.
    if (!isMounted.current) return undefined;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const isCurrent = () => controller.current === current;

    setText("");
    setError(undefined);
    setWasStopped(false);
    setIsRunning(true);
    try {
      const answer = await task({
        signal: current.signal,
        onText: (partial) => {
          if (isCurrent()) setText(partial);
        },
      });
      if (isCurrent()) setText(answer);
      return answer;
    } catch (caught) {
      const fmError =
        caught instanceof FmError
          ? caught
          : new FmError("unknown", caught instanceof Error ? caught.message : String(caught));
      if (isCurrent()) {
        if (fmError.kind === "cancelled") setWasStopped(true);
        else setError(fmError);
      }
      return undefined;
    } finally {
      if (isCurrent()) setIsRunning(false);
    }
  }, []);

  const stop = useCallback(() => controller.current?.abort(), []);

  return { text, isRunning, error, wasStopped, run, stop };
}
