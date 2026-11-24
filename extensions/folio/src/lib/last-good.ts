import { LocalStorage } from "@raycast/api";
import type { LastGood } from "./snapshot";

/**
 * Last successfully loaded holdings per account, shown (marked with their time) when a refresh of
 * that account fails. Kept in LocalStorage rather than Cache: ⌘R clears Raycast's Cache, and a
 * failed ⌘R is exactly when this fallback is needed. Cleared on sign-in and sign-out.
 */
const PREFIX = "folio.lastGood:";

function parse(raw: unknown): LastGood | undefined {
  if (typeof raw !== "string") return undefined;
  try {
    const v = JSON.parse(raw) as LastGood;
    return v && typeof v.fetchedAt === "string" && v.holdings ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Reads the fallback copies for `keys`. Storage errors just mean no fallback. */
export async function readLastGood(keys: string[]): Promise<Map<string, LastGood>> {
  const out = new Map<string, LastGood>();
  await Promise.all(
    keys.map(async (key) => {
      try {
        const v = parse(await LocalStorage.getItem<string>(PREFIX + key));
        if (v) out.set(key, v);
      } catch {
        // no fallback for this account
      }
    }),
  );
  return out;
}

/** Removes this module's keys for which `keep` returns false. Best-effort: storage errors are ignored. */
async function prune(keep: (key: string) => boolean): Promise<void> {
  try {
    const all = await LocalStorage.allItems();
    await Promise.allSettled(
      Object.keys(all)
        .filter((k) => k.startsWith(PREFIX) && !keep(k.slice(PREFIX.length)))
        .map((k) => LocalStorage.removeItem(k)),
    );
  } catch {
    // nothing to prune, or storage unavailable
  }
}

/**
 * Stores fresh copies and drops copies for accounts that are no longer listed (removed accounts, or
 * another user's after signing in again), so nothing lingers. Best-effort.
 */
export async function saveLastGood(entries: [string, LastGood][], listed: Set<string>): Promise<void> {
  await Promise.allSettled(entries.map(([key, value]) => LocalStorage.setItem(PREFIX + key, JSON.stringify(value))));
  await prune((key) => listed.has(key));
}

export async function clearLastGood(): Promise<void> {
  await prune(() => false);
}
