import { useCallback, useEffect, useState } from "react";
import type { FmError } from "../lib/fm/errors";
import { toFmError } from "../services/errors";

export interface FmStreamState {
  text: string;
  isLoading: boolean;
  error?: FmError;
  retry: () => void;
}

export function useFmStream(
  run: (signal: AbortSignal, onText: (accumulated: string) => void) => Promise<string>,
  deps: unknown[],
): FmStreamState {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FmError>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setText("");
    setError(undefined);
    setIsLoading(true);

    run(controller.signal, (accumulated) => {
      if (!controller.signal.aborted) setText(accumulated);
    })
      .then((final) => {
        if (controller.signal.aborted) return;
        setText(final);
        setIsLoading(false);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        const fmError = toFmError(caught);
        if (fmError.kind !== "aborted") setError(fmError);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { text, isLoading, error, retry };
}
