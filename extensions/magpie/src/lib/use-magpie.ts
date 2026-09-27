import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

import { magpie } from "./exec";

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
    scope?: string;
    data?: T;
    error?: Error;
  }>({ isLoading: true });

  useEffect(() => {
    let cancelled = false;
    const command = JSON.parse(key) as string[];
    setState((current) => ({
      isLoading: true,
      scope: key,
      error: undefined,
      data: current.scope === key ? current.data : undefined,
    }));
    magpie(binaryPath, command, timeoutMs)
      .then((stdout) => {
        if (!cancelled) {
          setState({
            isLoading: false,
            scope: key,
            data: parseRef.current(stdout),
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState((current) => ({
            isLoading: false,
            scope: key,
            data: current.scope === key ? current.data : undefined,
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
