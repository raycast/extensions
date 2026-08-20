import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clearAllRecents, deleteRecent, verifyMigrationForDelete } from "../stores/recentsDelete";
import {
  RECENTS_KEY,
  carryRecentsOwnedFields,
  runRecentsMigration,
  withGenerationBump,
} from "../stores/recentsMigration";
import { mutations, reconcileById, replaceState } from "../stores/useStoredCollection";
import { createCollectionStore, type CollectionStore } from "../stores/collection";
import type { Conversation } from "../type";
import { toChronological } from "../utils";
import { resolveToast } from "../utils/toast";

/**
 * The `recents_v1` collection store. Reuses Task 1's `createCollectionStore` directly —
 * `add`/`update`/`reload` (Ask's continue path, and every other Recents mutation except
 * Delete/Clear) go through the SAME read-modify-write store every other collection uses.
 * Delete/Clear are deliberately NOT store mutations: they must destroy legacy-key rows
 * too (THE RULING) and must be gated on a verified migration, neither of which
 * `CollectionStore`'s generic shape expresses — see `recentsDelete.ts`.
 *
 * `persistFilter` here is a write-ADMISSION rule for conversations `recents_v1` has
 * never stored before (`collection.ts`'s updated contract, fix round 2) — it blocks a
 * brand-new zero-turn conversation from landing in `recents_v1` before Ask gives it a
 * first chat, inherited from `useConversations.tsx`'s identical rule for `conversations`.
 * It must NEVER cause an already-migrated zero-turn conversation (Task 5's
 * `mergeIntoRecents`/Test 7 explicitly preserves `chats: []` rows from legacy data) to be
 * dropped merely because Pin/Archive/Rename touches it — `collection.ts`'s `persist()`
 * now guarantees that structurally by only filtering rows absent from the pre-mutation
 * read. See `useRecents.test.ts` for the regression test and its falsification.
 *
 * THE INVARIANT this establishes: no user action other than an explicit Delete/Delete
 * All may remove a conversation from `recents_v1`. Pin, Unpin, Archive, Unarchive, and
 * Rename are all `update` calls and must be pure upserts with respect to row survival.
 *
 * Exported (not module-private) so `useRecents.test.ts` can drive this EXACT store
 * instance directly — the same "test the real wiring, not a reimplementation" discipline
 * `recentsDelete.test.ts` and `useModel.test.ts` already follow in this codebase.
 */
const baseRecentsStore: CollectionStore<Conversation> = createCollectionStore<Conversation>(RECENTS_KEY, {
  transformOnRead: (items) =>
    items.map((conversation) => ({ ...conversation, chats: toChronological(conversation.chats ?? []) })),
  persistFilter: (conversation) => (conversation.chats ?? []).length > 0,
  /**
   * FIELD OWNERSHIP ON THE LIVE WRITE PATH (HIGH — a partial answer overwriting a
   * complete one, second half).
   *
   * `updateIfPresent` is Ask's write path, and Ask persists the WHOLE conversation on
   * every stream tick from a React snapshot. Two things about that snapshot are stale by
   * construction:
   *
   * 1. It carries whatever `archived`/`title` the conversation had when Ask opened. A
   *    Recents action that archives or renames the conversation mid-stream is overwritten
   *    by Ask's very next tick. These are the same `RECENTS_OWNED_FIELDS` the migration's
   *    reconcile already protects — reused here rather than redefined, so adding a field
   *    to that list protects both paths at once.
   * 2. Its `chats` may hold an EARLIER, shorter answer than what storage already has, if
   *    a slower write lands after a faster one (see the `chats` rule below).
   *
   * `pinned`/`pinned_at`/`unpinned_at` are deliberately NOT carried from `current`: Ask's
   * Pin action writes exactly those fields and must be able to change them. It goes
   * through the same path, so blanket-carrying pin state here would make Pin a no-op.
   */
  mergeOnUpdate: (incoming, current) => {
    const owned = carryRecentsOwnedFields(incoming, current);
    return { ...owned, chats: pickLongerTranscript(incoming, current) };
  },
});

/**
 * Resolves `chats` between an incoming write and what storage holds (HIGH — a partial
 * answer overwriting a complete one, first half).
 *
 * Ask re-persists the entire conversation on every stream update. Those writes are not
 * serialized against each other by storage, so a write carrying a 200-character partial
 * answer can resolve AFTER a write carrying the finished 2000-character answer, truncating
 * it permanently — the user watches the answer complete on screen and finds it cut off in
 * Recents.
 *
 * Serializing Ask's writes per conversation (see `useAskConversation`) removes the
 * interleaving that causes this. This rule is the storage-level backstop for the same
 * problem, and it is what makes the guarantee hold across INDEPENDENT writers (two Ask
 * windows, or an Ask window and a Recents action) that no single in-process queue can
 * order.
 *
 * THE RULE: a conversation's transcript only ever grows. Prefer the side with more chats;
 * on an equal count prefer the side whose last answer is longer, which is the streaming
 * case (same turns, one further along). Never prefer strictly less text.
 *
 * This cannot lose a legitimate edit, because nothing in this extension edits or removes a
 * chat inside a conversation — the only mutations are appending a turn and streaming an
 * answer longer. Deleting a conversation goes through `remove`/`deleteRecent`, not here.
 */
function pickLongerTranscript(incoming: Conversation, current: Conversation): Conversation["chats"] {
  const incomingChats = incoming.chats ?? [];
  const currentChats = current.chats ?? [];

  if (incomingChats.length !== currentChats.length) {
    return incomingChats.length > currentChats.length ? incomingChats : currentChats;
  }

  const incomingLast = incomingChats[incomingChats.length - 1];
  const currentLast = currentChats[currentChats.length - 1];
  if (!incomingLast || !currentLast) return incomingChats;

  // Same turn count: the further-along stream wins. Compared on the last answer only,
  // since that is the only one still growing.
  return (incomingLast.answer ?? "").length >= (currentLast.answer ?? "").length ? incomingChats : currentChats;
}

/**
 * `baseRecentsStore` wrapped so every MUTATION announces itself by bumping the
 * `recents_v1` generation counter (HIGH D).
 *
 * Why the wrapper rather than a bump at each call site: a Recents action (pin, unpin,
 * archive, unarchive, rename) and Ask's persist all write through this store, and a
 * migration holding an older snapshot will happily overwrite any of them with its
 * whole-key write. The counter is what lets that migration notice it is stale — but only
 * if EVERY writer bumps it. Leaving the bump to call sites is precisely how the fourth
 * one gets forgotten; wrapping the store makes it impossible to mutate `recents_v1`
 * through this object without announcing the write.
 *
 * `read` is passed through untouched — a read changes nothing and must not move the
 * counter, or every reader would invalidate every concurrent writer for no reason.
 *
 * THE BUMP HAPPENS BEFORE THE WRITE, not after (`withGenerationBump`). Bumping afterwards
 * left a gap: the store wrote `recents_v1`, and a migration that re-read the counter in
 * that gap saw it unchanged, passed its staleness check, and overwrote the write that had
 * just landed — the later bump then announced a change already lost. Announcing first
 * makes the counter strictly precede the change it describes. See `withGenerationBump` for
 * the trade this accepts (a failed write leaves the counter ahead, costing one redundant
 * idempotent migration retry — far cheaper than a silently erased user action).
 */
export const recentsStore: CollectionStore<Conversation> = {
  read: baseRecentsStore.read,
  add: (item) => withGenerationBump(() => baseRecentsStore.add(item)),
  update: (item) => withGenerationBump(() => baseRecentsStore.update(item)),
  // `updateIfPresent` bumps up front like every other writer even though it may decline to
  // write. A bump with no write is harmless (a concurrent migration recomputes against
  // unchanged data and converges); deciding whether to bump AFTER learning the outcome
  // would reintroduce exactly the write-then-announce ordering this wrapper exists to fix.
  updateIfPresent: (item) => withGenerationBump(() => baseRecentsStore.updateIfPresent(item)),
  remove: (id) => withGenerationBump(() => baseRecentsStore.remove(id)),
  clear: () => withGenerationBump(() => baseRecentsStore.clear()),
  write: (items) => withGenerationBump(() => baseRecentsStore.write(items)),
};

export type RecentsHook = {
  data: Conversation[];
  isLoading: boolean;
  /** Direct upsert — same shape as `src/model.tsx`'s toggle, not an effect chain. */
  update: (conversation: Conversation) => Promise<void>;
  reload: () => Promise<void>;
  /** Deletes one conversation from `recents_v1` AND all three legacy keys (THE RULING).
   *  Runs and verifies the migration first, structurally (see `recentsDelete.ts`). */
  remove: (conversation: Conversation) => Promise<void>;
  /** Clears `recents_v1` AND all three legacy keys. Same migration-first guard as `remove`. */
  clear: () => Promise<void>;
};

export function useRecents(): RecentsHook {
  const [data, setData] = useState<Conversation[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const applyTransform = useCallback(
    (items: Conversation[]): Conversation[] =>
      items.map((conversation) => ({ ...conversation, chats: toChronological(conversation.chats ?? []) })),
    [],
  );

  const reload = useCallback(async () => {
    try {
      // Runs the migration first on every load, per Task 5/6: idempotent, so mounting
      // Recents repeatedly is cheap, and this is what makes a fresh install (or one that
      // never opened Recents before) see its legacy conversations/history/savedChats
      // folded into `recents_v1` the first time this command opens.
      const { rescuedSideKeys } = await runRecentsMigration();
      const items = await mutations.reload.run(recentsStore);
      setData((previous) => mutations.reload.applyTo(items, previous));

      // THE PANIC CASE, surfaced. A legacy key whose contents could not be fully parsed was
      // preserved verbatim instead of being deleted by retirement. A silent rescue beats a
      // silent deletion, but the user cannot act on what they cannot see — so say it once,
      // as a toast rather than a UI surface. This fires only on the migration pass that
      // actually rescued something, which for almost every user is never.
      if (rescuedSideKeys.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title:
            rescuedSideKeys.length === 1
              ? "Couldn't read 1 older conversation record"
              : `Couldn't read ${rescuedSideKeys.length} older conversation records`,
          message: "The unreadable data was preserved, not deleted.",
          // House Style: a Failure toast carries a copy action. Here the useful thing to
          // copy is WHERE the rescued data went, since that is the only handle the user has
          // on it.
          primaryAction: {
            title: "Copy Storage Keys",
            onAction: async (toast) => {
              await Clipboard.copy(rescuedSideKeys.join("\n"));
              await toast.hide();
            },
          },
        });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't load recents" });
    } finally {
      setLoading(false);
    }
    // `recentsStore` is a module-level singleton with stable identity — nothing to
    // depend on here beyond that, matching `useStoredCollection.ts`'s `reload`.
  }, []);

  useEffect(() => {
    // `reload` is memoized on `[]` above, so its identity is stable across the hook's
    // lifetime — this effect fires on mount only, matching every other collection hook.
    reload();
  }, [reload]);

  /**
   * Direct upsert: read fresh, write, reconcile onto in-memory state. Follows
   * `src/model.tsx`'s toggle shape (a plain `models.update({ ...model, pinned: ... })`
   * call) rather than `src/conversation.tsx:19-27`'s `setState` + two `useEffect`s
   * chained together to eventually call `conversations.update` — the brief singles that
   * effect chain out as the source of the stale-selection bugs this command replaces.
   */
  const update = useCallback(
    async (conversation: Conversation) => {
      const result = await mutations.update.run(recentsStore, applyTransform, conversation);
      setData((previous) => reconcileById(result, previous));
    },
    [applyTransform],
  );

  const remove = useCallback(
    async (conversation: Conversation) => {
      const toast = await showToast({ title: "Deleting conversation...", style: Toast.Style.Animated });
      try {
        // Structural guard: `deleteRecent` requires a `MigrationVerifiedToken`, and the
        // ONLY way to produce one is to await `verifyMigrationForDelete()` (which runs
        // and verifies the real `runRecentsMigration()`) to completion right here. There
        // is no code path into `deleteRecent` that skips this — see `recentsDelete.ts`.
        const token = await verifyMigrationForDelete();
        const result = await deleteRecent(token, conversation.id);
        setData(replaceState(applyTransform(result)));
        // Hide-and-reshow rather than mutating the live toast — see `src/utils/toast.ts`.
        await resolveToast(toast, { title: "Conversation deleted", style: Toast.Style.Success });
      } catch (error) {
        await toast.hide();
        await showFailureToast(error, { title: "Couldn't delete conversation" });
      }
    },
    [applyTransform],
  );

  const clear = useCallback(async () => {
    const toast = await showToast({ title: "Deleting all recents...", style: Toast.Style.Animated });
    try {
      const token = await verifyMigrationForDelete();
      const result = await clearAllRecents(token);
      setData(replaceState(applyTransform(result)));
      await resolveToast(toast, { title: "All recents deleted", style: Toast.Style.Success });
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Couldn't delete recents" });
    }
  }, [applyTransform]);

  return useMemo(
    () => ({ data, isLoading, update, reload, remove, clear }),
    [data, isLoading, update, reload, remove, clear],
  );
}
