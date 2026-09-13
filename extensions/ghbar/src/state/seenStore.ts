import { LocalStorage } from "@raycast/api";
import {
  DecodedSeenState,
  SeenState,
  decodeSeenState,
  emptySeenState,
  encodeSeenState,
  mergeSeenState,
  prune,
} from "../core/seen";

/**
 * Seen state lives in `LocalStorage`: Raycast's encrypted store, shared across
 * the extension's commands. The data is small (one timestamp per URL), so the
 * "not for large data" caveat does not apply.
 */
const KEY = "ghbar.seen";

export async function loadSeenState(): Promise<DecodedSeenState> {
  try {
    return decodeSeenState(await LocalStorage.getItem<string>(KEY));
  } catch {
    // Storage unreachable. Carrying on with an empty state means everything
    // looks unread, which is not data loss.
    return { state: emptySeenState(), needsNotificationBackfill: false };
  }
}

export async function saveSeenState(state: SeenState): Promise<void> {
  await LocalStorage.setItem(KEY, encodeSeenState(state));
}

/** Sign-out: a new account must not inherit the previous one's seen record. */
export async function resetSeenState(): Promise<void> {
  await LocalStorage.removeItem(KEY);
}

/**
 * Guarded write: re-reads storage immediately before writing and merges, so a
 * concurrent process cannot clobber fresh marks with a stale snapshot.
 *
 * This is NOT a lock — `LocalStorage` offers none, and a tiny window remains
 * between the read and the write. But the window that mattered was as long as
 * a network round-trip; this shrinks it to microseconds. Because seen-ness is
 * monotonic, the worst case is a delayed mark, not a lost one.
 */
export async function commitSeenState(state: SeenState, live?: Set<string>): Promise<SeenState> {
  const { state: current } = await loadSeenState();
  // Prune AFTER merging: the other order would let the merge reinstate dead
  // URLs still present in storage, undoing the prune.
  const merged = live === undefined ? mergeSeenState(current, state) : prune(mergeSeenState(current, state), live);
  await saveSeenState(merged);
  return merged;
}
