import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

import { magpie } from "./exec";

type Preferences = { binaryPath?: string };

export function useMagpie<T>(
  args: string[],
  parse: (stdout: string) => T,
  timeoutMs?: number,
) {
  const { binaryPath } = getPreferenceValues<Preferences>();
  const key = JSON.stringify(args);
  const parseRef = useRef(parse);
  parseRef.current = parse;
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{
    isLoading: boolean;
    data?: T;
    error?: Error;
  }>({ isLoading: true });

  useEffect(() => {
    let cancelled = false;
    const command = JSON.parse(key) as string[];
    setState((current) => ({ ...current, isLoading: true, error: undefined }));
    magpie(binaryPath, command, timeoutMs)
      .then((stdout) => {
        if (!cancelled)
          setState({ isLoading: false, data: parseRef.current(stdout) });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [binaryPath, key, timeoutMs, tick]);

  const revalidate = useCallback(() => setTick((value) => value + 1), []);
  return { ...state, revalidate };
}
