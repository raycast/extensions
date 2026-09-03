import { useCachedPromise } from "@raycast/utils";
import { findRunpool, getStatus, Status } from "../lib/runpool";

/**
 * Pool status, revalidating in the background.
 *
 * `installed` is returned separately from the error, because a missing
 * executable is an ordinary first-run state rather than a failure and the
 * caller shows a whole screen for it rather than a toast.
 *
 * `hasFetched` exists alongside `isLoading` on purpose. A list that checks only
 * `isLoading` shows its empty view for a frame before the first data arrives,
 * which reads as "nothing here" rather than "not yet".
 */
export function useStatus(options?: { local?: boolean }) {
  const installed = findRunpool() !== null;

  const { data, isLoading, revalidate, error } = useCachedPromise(
    async (local: boolean) => getStatus({ local }),
    [options?.local ?? false],
    { execute: installed, keepPreviousData: true },
  );

  return {
    status: data as Status | undefined,
    isLoading,
    hasFetched: data !== undefined,
    installed,
    error,
    revalidate,
  };
}
