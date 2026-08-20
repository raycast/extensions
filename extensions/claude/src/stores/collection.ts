import { LocalStorage } from "@raycast/api";

/**
 * Options for a collection store. All three exist to carry real behavior out of the
 * current per-hook implementations:
 * - `transformOnRead` carries read-time transcript repair (reversed conversations).
 * - `keep` carries `clear()`-preserves-pinned.
 * - `persistFilter` carries the "don't persist an in-flight empty conversation" rule —
 *   see its own docstring below for the write-admission-not-deletion semantics.
 */
export type CollectionOptions<T> = {
  /** Runs on every read. Use for read-time repair/migration of stored rows. */
  transformOnRead?: (items: T[]) => T[];
  /** Rows matching this survive `clear()`. Default: nothing survives. */
  keep?: (item: T) => boolean;
  /**
   * A WRITE-ADMISSION rule for rows the store has never persisted before, NOT a delete
   * rule for rows already sitting in storage. `false` blocks a brand-new row (one whose
   * id is absent from what `readRaw()` sees at the start of this mutation) from being
   * written at all — e.g. an in-flight empty conversation Ask hasn't answered yet. It
   * must NEVER cause a row that was already persisted to be dropped on the next write
   * that merely touches it (pin/archive/rename), even if that row would fail the filter
   * today. See `persist()` below for the mechanics, and
   * `useRecents.test.ts`/`collection.test.ts` for the regression this fixes: pinning a
   * migrated zero-turn conversation used to delete it from storage outright, because
   * `persistFilter` was being applied to the ENTIRE next list on every write, not just
   * the rows genuinely new to it.
   */
  persistFilter?: (item: T) => boolean;
  /**
   * Resolves an incoming row against the row storage currently holds, inside the same
   * read-modify-write that writes it. Applies to `updateIfPresent` only — the one write
   * path whose callers (Ask) hold a whole-object snapshot they do not fully own.
   *
   * WHY: a writer that persists a WHOLE conversation snapshot overwrites every field on
   * the row, including fields it never manages. Ask streams answers and re-persists the
   * entire conversation on each tick, so a Recents-owned `archived`/`title` written
   * concurrently is clobbered by Ask's next snapshot, which predates it. This hook is
   * where a store expresses "the incoming writer does not own these fields" — the same
   * idea `RECENTS_OWNED_FIELDS` already encodes for the migration's reconcile, applied to
   * the live write path.
   *
   * `incoming` is what the caller asked to write; `current` is what storage holds right
   * now. Return the row to persist.
   */
  mergeOnUpdate?: (incoming: T, current: T) => T;
};

/** Outcome of a conditional write — see `updateIfPresent`. */
export type ConditionalUpdate<T> = {
  /** False when the row was absent from storage, so nothing was written. */
  written: boolean;
  /** Storage contents after the call. Unchanged from the pre-call read when `!written`. */
  items: T[];
};

export type CollectionStore<T extends { id: string }> = {
  read: () => Promise<T[]>;
  add: (item: T) => Promise<T[]>;
  update: (item: T) => Promise<T[]>;
  /**
   * An `update` that REFUSES to insert. Writes `item` only if a row with its id is
   * already present in the read this very mutation performs; otherwise writes nothing and
   * reports `written: false`.
   *
   * WHY THIS EXISTS (CRITICAL — Ask/Pin resurrecting a deleted conversation). `update` is
   * an upsert, so a writer holding a pre-deletion snapshot recreates the row it was told
   * to update. Guarding that with a separate `exists?` call before `update` does not fix
   * it: the check and the write are two awaits with a delete-sized window between them.
   * Deciding inside the same read-modify-write closes the window instead of narrowing it —
   * the existence test and the write now consume the SAME read, so no interleaving can
   * separate them. There is no `await` between `readRaw()` and `persist()` below.
   */
  updateIfPresent: (item: T) => Promise<ConditionalUpdate<T>>;
  remove: (id: string) => Promise<T[]>;
  clear: () => Promise<T[]>;
  write: (items: T[]) => Promise<void>;
};

/**
 * A generic, LocalStorage-backed collection store with read-modify-write mutations.
 *
 * Every mutation re-reads storage immediately before applying its change, then writes
 * back. This is what closes the cross-process lost-update hole: two independent stores
 * (e.g. one per mounted command) that each read, then each write, will not clobber one
 * another's addition, because neither writes from a stale in-memory snapshot.
 *
 * No React here — this is pure async logic over `LocalStorage`, which is what makes it
 * testable without a Raycast host process.
 */
export function createCollectionStore<T extends { id: string }>(
  key: string,
  options: CollectionOptions<T> = {},
): CollectionStore<T> {
  const { transformOnRead, keep, persistFilter, mergeOnUpdate } = options;

  /**
   * Picks a side-key for a corrupt-value rescue that nothing already occupies. Two
   * rescues landing in the same millisecond would otherwise collide on the timestamp
   * alone and the second `setItem` would silently overwrite the first's rescued
   * payload — data loss inside the data-rescue path. Checking occupancy and appending
   * a counter suffix makes collision impossible for rescues that run sequentially
   * (each `getItem` probe observes the prior rescue's `setItem`, which is everything
   * the test suite exercises). It is check-then-write, not a lock: two rescues racing
   * inside the same microtask turn could both probe before either writes and still
   * collide. That residual gap is the same no-lock class as this module's inherent
   * cross-store race and is deliberately out of scope here.
   */
  const pickCorruptSideKey = async (): Promise<string> => {
    const base = `${key}__corrupt_${new Date().toISOString()}`;
    let candidate = base;
    let suffix = 1;
    while ((await LocalStorage.getItem<string>(candidate)) !== undefined) {
      candidate = `${base}_${suffix}`;
      suffix += 1;
    }
    return candidate;
  };

  /**
   * Parses the raw stored JSON with no read-time transform applied. Used internally by
   * mutations, which must read-modify-write against the untransformed rows — applying
   * `transformOnRead` here would persist the transformed shape back to storage on every
   * mutation, turning a read-time repair into a silent migration on every write.
   */
  const readRaw = async (): Promise<T[]> => {
    const raw = await LocalStorage.getItem<string>(key);
    if (raw === undefined) return [];

    try {
      return JSON.parse(raw) as T[];
    } catch {
      // Corrupt data must not throw (the UI still needs to render), and must not be
      // silently destroyed by the next write either. Preserve the raw bad value under a
      // sibling key before anything else touches `key`.
      //
      // Ordering is load-bearing: the side-key write must resolve BEFORE `key` itself
      // is touched. If `key` were repaired first and the side-key write then failed or
      // raced, the rescue would have nothing to fall back on.
      const sideKey = await pickCorruptSideKey();
      await LocalStorage.setItem(sideKey, raw);

      // Make the corrupt state non-recurring: once the raw value is safely copied out,
      // repair `key` to a valid empty list so subsequent calls (mutations AND reads)
      // take the normal path instead of re-entering this catch block. Without this,
      // every read against a still-corrupt key mints another side-key forever —
      // unbounded growth in a store whose whole point is durability. This repair lives
      // here, in the one chokepoint every mutation and `read()` shares, rather than
      // only in `read()`, specifically so a mutation that happens to be the first
      // caller after corruption also clears it, not just a display read.
      await LocalStorage.setItem(key, JSON.stringify([]));

      return [];
    }
  };

  /**
   * Writes `items` to storage, applying `persistFilter` ONLY to rows whose id is absent
   * from `previouslyPersistedIds` — i.e. rows this mutation is introducing for the first
   * time. A row whose id WAS already in storage before this mutation started is written
   * through unfiltered, so `persistFilter` can gate admission of new rows without ever
   * being able to delete an existing one purely because its current shape happens to
   * fail the predicate (e.g. a migrated conversation with `chats: []`, which
   * `persistFilter: (c) => c.chats.length > 0` would otherwise strip on every touch).
   *
   * `previouslyPersistedIds` must come from a read taken before this mutation's own
   * change is applied (`current` in each mutation below, not `next`) — passing `next`'s
   * ids here would make every row "previously persisted" and silently disable the
   * filter entirely.
   */
  const persist = async (items: T[], previouslyPersistedIds: ReadonlySet<string>): Promise<void> => {
    const toPersist = persistFilter
      ? items.filter((item) => previouslyPersistedIds.has(item.id) || persistFilter(item))
      : items;
    await LocalStorage.setItem(key, JSON.stringify(toPersist));
  };

  const read = async (): Promise<T[]> => {
    const items = await readRaw();
    return transformOnRead ? transformOnRead(items) : items;
  };

  const add = async (item: T): Promise<T[]> => {
    const current = await readRaw();
    const previouslyPersistedIds = new Set(current.map((existing) => existing.id));
    const next = current.some((existing) => existing.id === item.id) ? current : [...current, item];
    await persist(next, previouslyPersistedIds);
    return next;
  };

  const update = async (item: T): Promise<T[]> => {
    const current = await readRaw();
    const previouslyPersistedIds = new Set(current.map((existing) => existing.id));
    const exists = current.some((existing) => existing.id === item.id);
    const next = exists ? current.map((existing) => (existing.id === item.id ? item : existing)) : [...current, item];
    await persist(next, previouslyPersistedIds);
    return next;
  };

  const updateIfPresent = async (item: T): Promise<ConditionalUpdate<T>> => {
    const current = await readRaw();
    const existing = current.find((row) => row.id === item.id);

    // ABSENT — the row was deleted (or never existed). Write NOTHING. Returning the read
    // we already have, rather than re-reading, keeps this whole mutation a single
    // storage read with no interleaving point after the decision.
    if (!existing) return { written: false, items: current };

    const previouslyPersistedIds = new Set(current.map((row) => row.id));
    const merged = mergeOnUpdate ? mergeOnUpdate(item, existing) : item;
    const next = current.map((row) => (row.id === item.id ? merged : row));
    await persist(next, previouslyPersistedIds);
    return { written: true, items: next };
  };

  const remove = async (id: string): Promise<T[]> => {
    const current = await readRaw();
    const previouslyPersistedIds = new Set(current.map((existing) => existing.id));
    const next = current.filter((existing) => existing.id !== id);
    await persist(next, previouslyPersistedIds);
    return next;
  };

  const clear = async (): Promise<T[]> => {
    const current = await readRaw();
    const next = keep ? current.filter(keep) : [];
    // `clear` is intentionally exempt from the "never delete an existing row" guarantee
    // above — it's the user's explicit bulk-delete action for THIS store, not an
    // incidental side effect of touching one row. `persistFilter` still applies to
    // whatever `keep` lets through, matching this function's prior behavior; the id set
    // passed here is deliberately empty so no row is treated as previously-persisted for
    // the purposes of the filter, which only matters if `persistFilter` would otherwise
    // admit something `keep` excluded, and it does not, since `next` is already narrowed
    // to what `keep` allows.
    await persist(next, new Set());
    return next;
  };

  const write = async (items: T[]): Promise<void> => {
    // Direct overwrite of the whole collection (e.g. a future bulk-import path) — there
    // is no "previous mutation's current" here since the caller supplies the full
    // target state directly, so every row in `items` is treated as new for filter
    // purposes, matching this function's prior (pre-fix) behavior exactly.
    await persist(items, new Set());
  };

  return { read, add, update, updateIfPresent, remove, clear, write };
}
