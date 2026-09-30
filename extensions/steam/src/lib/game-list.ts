import { captureException, getPreferenceValues } from "@raycast/api";
import { markKeyAccepted, markKeyRejected } from "./hooks";
import { SteamNetworkError } from "./http";
import { getOwnedGames } from "./library";
import { addedSince, IndexSyncError, syncIndex } from "./search-index";

export const isRejectedKeyFailure = (failure: unknown) =>
  failure instanceof IndexSyncError && (failure.status === 401 || failure.status === 403);

export async function downloadGameList(key: string) {
  try {
    await syncIndex(key);
  } catch (failure) {
    // steamFetch already reported network failures and server errors
    const reported =
      failure instanceof SteamNetworkError || (failure instanceof IndexSyncError && failure.status >= 500);
    if (!reported) captureException(failure);
    if (isRejectedKeyFailure(failure)) await markKeyRejected(key);
    throw failure;
  }
  await markKeyAccepted(key);
}

// Re-reading the library records games bought since the last read with today's added date
export async function refreshGameList(key: string) {
  const startedAt = Math.floor(Date.now() / 1000);
  await downloadGameList(key);
  if (getPreferenceValues<Preferences>().steamid?.trim()) await getOwnedGames().catch(() => undefined);
  return addedSince(startedAt);
}
