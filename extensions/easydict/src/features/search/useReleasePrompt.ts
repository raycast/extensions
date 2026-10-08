/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { useLocalStorage } from "@raycast/utils";

import { EASYDICT_VERSION } from "@/consts";

/**
 * Tracks whether the release notes prompt should be shown for the current version.
 *
 * Uses `LocalStorage` (not Cache) to persist the dismissed version across
 * sessions — same persistence semantics as the old `Easydict.hasPrompted`.
 *
 * Simple logic: if the user has never dismissed this version, show the prompt.
 * On dismiss, store the current version — prompt hides until the next version bump.
 */
export function useReleasePrompt() {
  const {
    value: promptedVersion,
    setValue: setPromptedVersion,
    isLoading,
  } = useLocalStorage<string>("release-prompted-version", "");

  // Don't show during initial load — LocalStorage read is async.
  const isShowingReleasePrompt = !isLoading && EASYDICT_VERSION !== (promptedVersion ?? "");

  const hideReleasePrompt = () => setPromptedVersion(EASYDICT_VERSION);

  return { isShowingReleasePrompt, hideReleasePrompt };
}
