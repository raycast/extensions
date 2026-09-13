/**
 * The rows this Mac has actually used, so the second time you need a
 * shortcut is faster than the first.
 *
 * Pure and storage-free on purpose: the persistence is Raycast's
 * `LocalStorage`, which cannot be imported outside a running Raycast, and
 * the interesting part — what gets evicted, what order things come back in
 * — is exactly the part worth testing. The command does the I/O.
 */
export type Recents = Record<string, number>;

/**
 * How many ids are kept. Generous enough that a week of use survives,
 * small enough that the whole thing is one cheap JSON round-trip on every
 * command launch. Eviction is by age, so the entries that go are the ones
 * already at the bottom of the list.
 */
export const MAX_RECENTS = 50;

/** How many appear in the "Recently Used" section. */
export const RECENT_SECTION_SIZE = 5;

export function parse(raw: string | undefined): Recents {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Recents = {};
    for (const [id, at] of Object.entries(parsed as Record<string, unknown>)) {
      // Anything that isn't a usable timestamp is dropped rather than
      // carried: a NaN here would sort unpredictably and stick around
      // forever, since eviction compares timestamps.
      if (typeof at === "number" && Number.isFinite(at)) out[id] = at;
    }
    return out;
  } catch {
    // A corrupt store is not worth a visible error. It costs the user their
    // recent list, once.
    return {};
  }
}

export function remember(recents: Recents, id: string, now: number = Date.now()): Recents {
  const next: Recents = { ...recents, [id]: now };
  const ids = Object.keys(next);
  if (ids.length <= MAX_RECENTS) return next;
  for (const stale of ids.sort((a, b) => next[b] - next[a]).slice(MAX_RECENTS)) {
    delete next[stale];
  }
  return next;
}

/**
 * The remembered ids, most recent first.
 *
 * Recency, not frequency: in a launcher the thing you want is almost always
 * the thing you just wanted, and a frequency ranking would keep a shortcut
 * you hammered once last month above the one you looked up a minute ago.
 *
 * Filtered against `known` because sheets change — a row remembered from a
 * sheet that has since been edited or deleted must not become a ghost
 * entry that can never be cleared.
 */
export function rank(recents: Recents, known: ReadonlySet<string>, limit: number = RECENT_SECTION_SIZE): string[] {
  return Object.keys(recents)
    .filter((id) => known.has(id))
    .sort((a, b) => recents[b] - recents[a])
    .slice(0, limit);
}
