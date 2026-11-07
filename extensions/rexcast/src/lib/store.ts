import type { Stored } from "./block-state";

export type Store = Record<string, Stored>;

/**
 * The saved activity after a poll. A failed read must never erase what we know:
 * - sessions read fine → their fresh entries replace the old ones;
 * - sessions listed but whose read failed → keep their previous entries;
 * - sessions no longer listed (the list itself succeeded) → confirmed gone, dropped.
 */
export function nextStore(prev: Store, fresh: Store, listed: string[], failed: string[]): Store {
  const out: Store = { ...fresh };
  for (const [key, value] of Object.entries(prev)) {
    const session = key.slice(0, key.indexOf("|"));
    if (failed.includes(session) && listed.includes(session) && !(key in out)) out[key] = value;
  }
  return out;
}
