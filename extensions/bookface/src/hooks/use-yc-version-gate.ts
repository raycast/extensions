import { useCachedPromise } from "@raycast/utils";
import { runYc, type VersionGate } from "../lib/yc";
import type { Me } from "../lib/types";

export type VersionGateState = {
  /** True once the mount probe has resolved (success or failure). */
  checked: boolean;
  isLoading: boolean;
  /** Set when the CLI refused to run because it's too old. */
  updateRequired: boolean;
  gate: VersionGate | undefined;
  revalidate: () => void;
};

// Probe the CLI version the moment a command mounts, independent of whatever
// the command's own data fetch does. The version gate fires on any real API
// call, so a cheap authed `yc me` is enough to detect a too-old binary — this
// lets a command (e.g. Search) bounce straight to the update screen instead of
// showing a working-looking empty state that silently returns nothing.
//
// Only the update-required signal is surfaced here; auth/missing-cli are left
// to the command's primary fetch so we don't duplicate every empty state.
export function useYcVersionGate(): VersionGateState {
  const { data, isLoading, revalidate } = useCachedPromise(
    () => runYc<Me>(["me", "--json"]),
    [],
    { keepPreviousData: true },
  );

  const updateRequired = data?.ok === false && data.kind === "update-required";

  return {
    checked: data !== undefined,
    isLoading,
    updateRequired,
    gate: updateRequired ? data.gate : undefined,
    revalidate,
  };
}
