import { useCallback, useEffect, useRef, useState } from "react";

export type DiscoveryState<T> =
  | { kind: "loading" }
  | { kind: "cancelled" }
  | { kind: "success"; result: T }
  | { kind: "error"; message: string };

export function useDiscovery<T>(
  check: (input: string, signal: AbortSignal) => Promise<T>,
  input: string,
  enabled: boolean,
) {
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<{ input: string; attempt: number; state: DiscoveryState<T> }>({
    input,
    attempt,
    state: { kind: "loading" },
  });
  const controller = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const request = new AbortController();
    controller.current = request;
    const update = (state: DiscoveryState<T>) => {
      if (controller.current === request && !request.signal.aborted) {
        setSnapshot({ input, attempt, state });
      }
    };
    update({ kind: "loading" });
    void check(input, request.signal).then(
      (result) => update({ kind: "success", result }),
      (error: unknown) => update({ kind: "error", message: error instanceof Error ? error.message : "Request failed" }),
    );
    return () => {
      request.abort();
      if (controller.current === request) controller.current = null;
    };
  }, [check, input, enabled, attempt]);

  const cancel = useCallback(() => {
    abort();
    setSnapshot({ input, attempt, state: { kind: "cancelled" } });
  }, [abort, input, attempt]);

  const retry = useCallback(() => {
    abort();
    setAttempt((value) => value + 1);
  }, [abort]);

  // Do not display the previous input's result while the new effect is starting.
  const state: DiscoveryState<T> =
    snapshot.input === input && snapshot.attempt === attempt ? snapshot.state : { kind: "loading" };
  return { state, cancel, retry };
}
