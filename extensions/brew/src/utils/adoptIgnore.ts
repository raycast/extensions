/**
 * Apps the user has dismissed from the Adopt scan.
 *
 * Keyed by **bundle id**, not path or name: an app that moves between
 * `/Applications` and `~/Applications`, or gets renamed, is the same app and
 * should stay dismissed. The name is the thing the scan matches on and is
 * exactly what a bad match gets wrong, so keying on it would be keying on the
 * mistake.
 *
 * An app with no readable bundle id cannot be ignored, and the command hides
 * the action rather than offering one that silently does nothing.
 */

import { LocalStorage } from "@raycast/api";
import { uiLogger } from "./logger";

const IGNORED_KEY = "adopt.ignored";

/**
 * The dismissed set.
 *
 * A damaged value reads as empty rather than throwing: the cost of forgetting
 * a dismissal is one row reappearing, against a command that will not open.
 */
export async function loadIgnoredBundleIds(): Promise<Set<string>> {
  try {
    const raw = await LocalStorage.getItem<string>(IGNORED_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch (err) {
    uiLogger.warn("Could not read the adopt ignore list", err);
    return new Set();
  }
}

/** Sorted so the stored value is stable and diffable. */
async function save(ids: Set<string>): Promise<void> {
  await LocalStorage.setItem(IGNORED_KEY, JSON.stringify([...ids].sort()));
}

export async function ignoreBundleId(bundleId: string): Promise<void> {
  const ids = await loadIgnoredBundleIds();
  ids.add(bundleId);
  await save(ids);
}

export async function stopIgnoringBundleId(bundleId: string): Promise<void> {
  const ids = await loadIgnoredBundleIds();
  ids.delete(bundleId);
  await save(ids);
}

/** Forget every dismissal. Offered only from the Ignored filter, where the list being emptied is on screen. */
export async function resetIgnoredApps(): Promise<void> {
  await LocalStorage.removeItem(IGNORED_KEY);
}
