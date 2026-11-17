import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import type { PreflightResult } from "../lib/preflight";
import { getPreflight } from "../services/preflight";

export function usePreflight(options: { force?: boolean } = {}): {
  result?: PreflightResult;
  isLoading: boolean;
  recheck: () => void;
} {
  const forceNext = useRef(options.force ?? false);
  const { data, isLoading, revalidate } = usePromise(() => {
    const force = forceNext.current;
    forceNext.current = false;
    return getPreflight({ force });
  });

  return {
    result: data,
    isLoading,
    recheck: () => {
      forceNext.current = true;
      revalidate();
    },
  };
}
