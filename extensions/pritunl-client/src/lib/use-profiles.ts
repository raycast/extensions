import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { listProfiles } from "./pritunl";
import { sortProfiles } from "./format";

/** Loads profiles, and reloads them every `refreshMs` while mounted if given. */
export function useProfiles(refreshMs?: number) {
  const result = useCachedPromise(async () => sortProfiles(await listProfiles()), [], {
    keepPreviousData: true,
    // Errors are shown in the view itself, so skip the default failure toast.
    onError: () => undefined,
  });

  useEffect(() => {
    if (!refreshMs) return;
    const timer = setInterval(result.revalidate, refreshMs);
    return () => clearInterval(timer);
  }, [refreshMs, result.revalidate]);

  return result;
}
