import { useEffect, useRef, useState } from "react";
import { finalizeText, streamRun, type ChatMessages, type RunResult } from "../commands/execute";
import { RunFailure, toRunFailure } from "../commands/failure";
import type { ResolvedRun } from "../commands/resolve";

/** Fast enough to read as live text, slow enough not to flood Raycast with view updates. */
const UPDATE_INTERVAL_MS = 80;

export interface RunRequest {
  id: number;
  run: ResolvedRun;
  messages: ChatMessages;
}

export type RunOutcome =
  | { status: "done"; text: string; result: RunResult }
  | { status: "canceled"; text: string }
  | { status: "failed"; failure: RunFailure };

/**
 * Runs the current request and reports how it ended. Leaving the view aborts it through the effect cleanup, because
 * Esc belongs to Raycast and cannot be bound to an action of its own.
 */
export function useRunStream(
  request: RunRequest | undefined,
  original: string | undefined,
  onSettled: (id: number, outcome: RunOutcome) => void,
) {
  const [liveText, setLiveText] = useState("");
  const [controller, setController] = useState<AbortController>();
  const settled = useRef(onSettled);
  settled.current = onSettled;

  useEffect(() => {
    if (!request) return;
    const abort = new AbortController();
    // A replaced run still settles after its successor started, and must not report over it.
    let current = true;
    setController(abort);
    setLiveText("");

    let latest = "";
    let timer: NodeJS.Timeout | undefined;
    const flush = () => {
      timer = undefined;
      if (current) setLiveText(latest);
    };

    streamRun(request.run, request.messages, abort.signal, (text) => {
      latest = text;
      timer ??= setTimeout(flush, UPDATE_INTERVAL_MS);
    })
      .then((result) => {
        clearTimeout(timer);
        if (!current) return;
        const text = finalizeText(result.text, original);
        settled.current(request.id, { status: "done", text, result: { ...result, text } });
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        if (!current) return;
        const outcome: RunOutcome = abort.signal.aborted
          ? { status: "canceled", text: latest }
          : { status: "failed", failure: toRunFailure(error) };
        settled.current(request.id, outcome);
      });

    return () => {
      current = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [request, original]);

  return { liveText, cancel: () => controller?.abort() };
}
