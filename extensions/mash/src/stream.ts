// Federated search for the Raycast list: `mash search --live --stream` runs
// for the current text and prints one line per update. Each line replaces the
// list until the reader moves the selection (or half a second passes); after
// that, rows already shown keep their places and later results join below.
// A new text, or closing Raycast, stops the process still searching.
import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Hit,
  MashError,
  type SourceState,
  type StreamScope,
  parseStreamLine,
  settle,
  streamArguments,
  mashEnvironment,
} from "./mash";

const SETTLE_MS = 500;

export interface StreamState {
  readonly hits: Hit[];
  readonly sources: SourceState[];
  readonly done: boolean;
  readonly error: Error | undefined;
}

const empty: StreamState = { hits: [], sources: [], done: true, error: undefined };

export function useStreamSearch(
  mash: string | undefined,
  query: string,
  scope: StreamScope,
  enabled: boolean,
  includeSubagents = false,
) {
  const [state, setState] = useState<StreamState>(empty);
  const frozen = useRef(false);
  const question = useRef("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!mash || !enabled) {
      setState(empty);
      return;
    }
    // A new text or scope starts unfrozen; trying again keeps the list as it is.
    const asked = `${query}\u0000${scope}`;
    if (asked !== question.current) {
      question.current = asked;
      frozen.current = false;
    }
    let child: ChildProcessWithoutNullStreams | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    setState((previous) => ({ ...previous, done: false, error: undefined }));
    child = spawn(mash, streamArguments(query, scope, includeSubagents), { env: mashEnvironment() });
    let pending = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      pending += chunk;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim() || stopped) continue;
        try {
          const update = parseStreamLine(line);
          setState((previous) => ({
            hits: settle(previous.hits, update.hits, frozen.current),
            sources: update.sources,
            done: update.done,
            error: undefined,
          }));
          if (update.hits.length && settleTimer === undefined)
            settleTimer = setTimeout(() => (frozen.current = true), SETTLE_MS);
        } catch (error) {
          setState((previous) => ({ ...previous, done: true, error: error as Error }));
        }
      }
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => (stderr += chunk));
    child.on("error", (error) => {
      if (!stopped) setState((previous) => ({ ...previous, done: true, error }));
    });
    child.on("close", (code) => {
      if (stopped || code === 0) return;
      let message = `Mash stopped without an answer (exit ${code}).`;
      try {
        const body = JSON.parse(stderr) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        // Keep the general message.
      }
      setState((previous) => ({ ...previous, done: true, error: new MashError(message) }));
    });
    return () => {
      stopped = true;
      clearTimeout(settleTimer);
      // A newer text or a closed window: the search still running stops.
      child?.kill();
      child = undefined;
    };
  }, [mash, query, scope, enabled, includeSubagents, attempt]);

  // Moving the selection keeps the list where it is.
  const interact = useCallback(() => {
    frozen.current = true;
  }, []);
  // Asked again, what is shown stays; new results join below.
  const retry = useCallback(() => {
    frozen.current = true;
    setAttempt((count) => count + 1);
  }, []);
  return { ...state, interact, retry };
}
