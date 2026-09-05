import { LocalStorage } from "@raycast/api";
import { ScopeOverride, decodeScopeOverride, emptyScopeOverride, encodeScopeOverride } from "../core/scope";

/**
 * Kept under its own key, separate from the seen state: that one is written
 * and pruned on every refresh, this one changes a few times a year. Sharing a
 * record would take on clobbering risk for nothing.
 */
const KEY = "ghbar.scope";

export async function loadScopeOverride(): Promise<ScopeOverride> {
  try {
    return decodeScopeOverride(await LocalStorage.getItem<string>(KEY));
  } catch {
    // Storage unreachable: fall back to preferences. The selection is still
    // on disk, so this is a display gap, not data loss.
    return emptyScopeOverride();
  }
}

export async function saveScopeOverride(override: ScopeOverride): Promise<void> {
  await LocalStorage.setItem(KEY, encodeScopeOverride(override));
}

/** Drops the selection entirely; scope comes from the preferences again. */
export async function clearScopeOverride(): Promise<void> {
  await LocalStorage.removeItem(KEY);
}
