import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type CollectionOptions, type CollectionStore, createCollectionStore } from "./collection";

export type StoredCollectionHook<T extends { id: string }> = {
  data: T[];
  isLoading: boolean;
  add: (item: T) => Promise<void>;
  update: (item: T) => Promise<void>;
  remove: (item: T) => Promise<void>;
  clear: () => Promise<void>;
  reload: () => Promise<void>;
};

/**
 * Reconciles an authoritative list (freshly read, or returned by an ADDITIVE mutation —
 * `add`, `update`, or `reload`) onto a previous in-memory list: authoritative rows win
 * by `id`, and in-memory rows whose id isn't mentioned in the authoritative list are
 * preserved as-is.
 *
 * This is ONLY correct when the authoritative list cannot have shrunk on purpose. It
 * exists for two reasons:
 *
 * - Behavior 4 (conversations): `reload` must not clobber a conversation Ask added from
 *   a mount effect that ran before the read resolved — in-memory rows whose ids aren't
 *   in storage yet must be preserved.
 * - Behavior 6: because `add`/`update` read from storage, and `persistFilter` has
 *   already filtered storage, a row `persistFilter` excludes is ABSENT from the list the
 *   NEXT `add`/`update` call returns (verified in Task 1's store). Without reconciling,
 *   an in-progress conversation with zero chats — e.g. the one Ask just added on mount —
 *   would vanish from state the instant any other mutation runs, even though it is still
 *   the row the user is looking at. The data survives either way (the upsert re-adds it
 *   once it has chats); this reconciliation is what keeps the UI honest in the meantime.
 *
 * `update` is additionally safe here because it is an upsert against the FULL
 * pre-`persistFilter` list (Task 1's contract), so its own returned list always
 * contains the row it just touched — this never resurrects something update removed,
 * because update cannot remove anything.
 *
 * DO NOT use this for `remove` or `clear`. Those are SUBTRACTIVE: the store's returned
 * list is a complete, authoritative statement of what should remain, and an absence in
 * it is deletion, not a gap to paper over. Reconciling their result would silently
 * un-delete the row the user just removed (see `replaceState` below).
 *
 * Pulled out as a pure, React-free function so Behavior 6 can be tested directly,
 * without rendering the hook.
 */
export function reconcileById<T extends { id: string }>(authoritative: T[], previous: T[]): T[] {
  const authoritativeIds = new Set(authoritative.map((item) => item.id));
  const preserved = previous.filter((item) => !authoritativeIds.has(item.id));
  return [...authoritative, ...preserved];
}

/**
 * The counterpart to `reconcileById`, for SUBTRACTIVE mutations (`remove`, `clear`).
 * The store's returned list already IS the next state — no merge, because a merge
 * would preserve the very row the mutation just deleted (its id, by definition, isn't
 * in what a subtractive mutation returns). This function exists mainly so the call
 * site names its intent instead of a bare `setData(result)` that looks, at a glance,
 * interchangeable with the reconciling path above.
 */
export function replaceState<T extends { id: string }>(authoritative: T[]): T[] {
  return authoritative;
}

/**
 * A store call plus how its result becomes the next in-memory state, expressed as a
 * two-phase pure/async split rather than one function:
 *
 * `run` does the actual (async) storage read-modify-write and applies `transformOnRead`
 * to the result — everything that must happen exactly once, regardless of how many
 * times React re-renders.
 *
 * `applyTo(returned, previous)` is a PURE, synchronous function deciding how that
 * result becomes the next state — `reconcileById` for additive mutations, `replaceState`
 * for subtractive ones. It's kept separate from `run` specifically so it can be called
 * from inside a React `setData` functional updater, where `previous` is always the
 * actual latest state (not a value closed over before an await) — using an async
 * function's own stale closure of `previous` would reintroduce a lost-update bug at the
 * React layer, the same class of bug Task 1's store exists to close at the storage layer.
 *
 * This is the seam that matters: the round-1 defect was never a bug in `reconcileById`
 * or `replaceState` individually — both were correct in isolation — it was in which one
 * a call site chose. `useStoredCollection` below calls `.run` then `.applyTo` for each
 * mutation with NO other logic in between, so testing `mutations.remove.applyTo` etc.
 * tests the actual wiring choice the hook makes, not a copy of it.
 */
export const mutations = {
  /** ADDITIVE: reconciles onto `previous`. See `reconcileById`. */
  add: {
    run: async <T extends { id: string }>(store: CollectionStore<T>, applyTransform: (items: T[]) => T[], item: T) =>
      applyTransform(await store.add(item)),
    applyTo: reconcileById,
  },
  /** ADDITIVE (upsert): reconciles onto `previous`. See `reconcileById`. */
  update: {
    run: async <T extends { id: string }>(store: CollectionStore<T>, applyTransform: (items: T[]) => T[], item: T) =>
      applyTransform(await store.update(item)),
    applyTo: reconcileById,
  },
  /** SUBTRACTIVE: replaces `previous` outright. See `replaceState`. `applyTo` takes no
   *  second parameter at all — that absence is exactly the point of "replace": there is
   *  no `previous` for a subtractive mutation's result to be reconciled against. */
  remove: {
    run: async <T extends { id: string }>(store: CollectionStore<T>, applyTransform: (items: T[]) => T[], id: string) =>
      applyTransform(await store.remove(id)),
    applyTo: <T extends { id: string }>(returned: T[]) => replaceState(returned),
  },
  /** SUBTRACTIVE: replaces `previous` outright. See `replaceState`. Same as `remove`
   *  above — `applyTo` takes no `previous` parameter. */
  clear: {
    run: async <T extends { id: string }>(store: CollectionStore<T>, applyTransform: (items: T[]) => T[]) =>
      applyTransform(await store.clear()),
    applyTo: <T extends { id: string }>(returned: T[]) => replaceState(returned),
  },
  /** ADDITIVE (reload): reconciles onto `previous`. See `reconcileById` / Behavior 4. */
  reload: {
    // `store.read()` already applies `transformOnRead`; no separate applyTransform call.
    run: async <T extends { id: string }>(store: CollectionStore<T>) => store.read(),
    applyTo: reconcileById,
  },
};

/**
 * Shared React hook wrapping Task 1's `createCollectionStore`. Every mutation is a
 * read-modify-write against `LocalStorage` (never a functional state updater over a
 * React snapshot) — `data` follows storage, storage is never derived from `data`.
 *
 * There is no write effect. The old `useEffect(() => setItem(...), [data])` pattern,
 * and the `hasLoadedRef` gate that only existed to stop it from persisting the
 * pre-load empty array, are both gone: mutations write directly, and nothing else does.
 */
export function useStoredCollection<T extends { id: string }>(
  key: string,
  options: CollectionOptions<T> = {},
): StoredCollectionHook<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  // Built once per mount. The store is pure closure logic over `key`/`options` with no
  // internal state of its own, so there is nothing to keep in sync by rebuilding it —
  // recreating it on every render would just be wasted allocation.
  const storeRef = useRef<CollectionStore<T> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createCollectionStore<T>(key, options);
  }
  const store = storeRef.current;

  const { transformOnRead } = options;

  /**
   * Applies the same read-time transform the store applies inside `read()`. Mutations
   * intentionally read/write the untransformed shape (so an unrelated `add` never
   * silently persists a migrated shape into storage) — but the list a mutation RETURNS
   * still needs the same repair applied before it becomes displayed state, or a
   * mutation would flash previously-repaired rows back into their raw stored shape.
   */
  const applyTransform = useCallback(
    (items: T[]): T[] => (transformOnRead ? transformOnRead(items) : items),
    [transformOnRead],
  );

  const reload = useCallback(async () => {
    try {
      const items = await mutations.reload.run(store);
      // `applyTo` runs inside the `setData` updater so `previous` is always the actual
      // latest state, never a value closed over before this `await`.
      setData((previous) => mutations.reload.applyTo(items, previous));
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't load data" });
    } finally {
      // Must resolve on every path, including empty-and-error: a first run has nothing
      // stored, and leaving this true would spin the list forever instead of showing
      // the empty state.
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    // `reload` is memoized on `[store]`, and `store` is built once in a ref, so its
    // identity is stable across the hook's lifetime — this effect fires on mount only,
    // with an honest dependency array rather than a suppressed lint rule.
    reload();
  }, [reload]);

  const add = useCallback(
    async (item: T) => {
      const result = await mutations.add.run(store, applyTransform, item);
      setData((previous) => mutations.add.applyTo(result, previous));
    },
    [store, applyTransform],
  );

  const update = useCallback(
    async (item: T) => {
      const result = await mutations.update.run(store, applyTransform, item);
      setData((previous) => mutations.update.applyTo(result, previous));
    },
    [store, applyTransform],
  );

  const remove = useCallback(
    async (item: T) => {
      const result = await mutations.remove.run(store, applyTransform, item.id);
      // No `previous` needed — `replaceState` (via `applyTo`) doesn't take one, by
      // construction: a subtractive mutation's result IS the next state.
      setData(mutations.remove.applyTo(result));
    },
    [store, applyTransform],
  );

  const clear = useCallback(async () => {
    const result = await mutations.clear.run(store, applyTransform);
    setData(mutations.clear.applyTo(result));
  }, [store, applyTransform]);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, clear, reload }),
    [data, isLoading, add, update, remove, clear, reload],
  );
}
