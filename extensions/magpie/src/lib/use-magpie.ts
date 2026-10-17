import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

import { magpie } from "./exec";

export function useMagpie<T>(
  args: string[],
  parse: (stdout: string) => T,
  timeoutMs?: number,
) {
  const { binaryPath } = getPreferenceValues<Preferences>();
  const argsKey = JSON.stringify(args);
  // The binary path is part of the scope. A failed path change must not
  // keep showing rows that came from the previous executable.
  const scope = `${binaryPath}\0${argsKey}`;
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
    const command = JSON.parse(argsKey) as string[];
    setState((current) => ({
      isLoading: true,
      scope,
      error: undefined,
      data: current.scope === scope ? current.data : undefined,
    }));
    magpie(binaryPath, command, timeoutMs)
      .then((stdout) => {
        if (!cancelled) {
          setState({
            isLoading: false,
            scope,
            data: parseRef.current(stdout),
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState((current) => ({
            isLoading: false,
            scope,
            data: current.scope === scope ? current.data : undefined,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [argsKey, binaryPath, scope, timeoutMs, tick]);

  const revalidate = useCallback(() => setTick((value) => value + 1), []);
  return { ...state, revalidate };
}
