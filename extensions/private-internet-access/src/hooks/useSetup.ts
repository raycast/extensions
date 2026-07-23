import { useEffect } from "react";
import { useCachedPromise } from "@raycast/utils";
import { detectSetup } from "../lib/pia";
import { SetupState } from "../types";

const REVALIDATE_MS = 3000;
const INITIAL: SetupState = { stage: "checking" };

/**
 * Setup only needs re-checking while something is missing — once PIA answers,
 * the install/CLI/login state won't change under us, so stop polling and leave
 * the per-tick cost to the status hook.
 */
export function useSetup() {
  const result = useCachedPromise(detectSetup, [], {
    keepPreviousData: true,
    initialData: INITIAL,
  });

  const stage = result.data?.stage ?? "checking";
  const settled = stage === "ready";

  useEffect(() => {
    if (settled) return;
    const id = setInterval(() => void result.revalidate(), REVALIDATE_MS);
    return () => clearInterval(id);
  }, [settled, result]);

  return result.data ?? INITIAL;
}
