import { useCallback, useRef } from "react";
import { LocalStorage } from "@raycast/api";
import { RECENTS_KEY } from "../stores/recentsMigration";
import { recentsStore } from "./useRecents";
import type { Conversation } from "../type";

/**
 * ASK'S PERSISTENCE PATH — `recents_v1`, and nothing else.
 *
 * WHAT THIS REPLACES. Ask used to persist through `useConversations()` (the
 * legacy `conversations` key) and `useChat` used to persist answers through `useHistory()`
 * (the legacy `history` key). With the legacy keys retired those are writes to keys that
 * no longer exist — and before retirement they were the resurrection engine:
 *
 *   open Ask on X -> delete X in Recents -> ask another question in the still-open Ask
 *   -> Ask writes its WHOLE stale in-memory conversation back to `conversations`
 *   -> the next Recents mount re-derives X from it, INCLUDING the answers the user
 *      explicitly deleted.
 *
 * Writing to `recents_v1` directly removes the re-derivation step entirely. It also means
 * Ask and Recents now share one read-modify-write store (`recentsStore`), so a write from
 * one is visible to the other without a migration in between.
 *
 * IS THERE STILL A SEPARATE FLAT `history` CONCEPT? No — and this hook is where that is
 * decided. The old `history` key was a flat, conversation-less list of every answer, and
 * the only surfaces that read it were the History command (already removed on this
 * branch) and the migration's orphan-synthesis path (which existed precisely to fold flat
 * answers back into conversations). Recents is the single surface now, and every answer
 * it shows lives inside a conversation's `chats`. A parallel flat list would be a second
 * source of truth for answer text — the exact thing the single-source-of-truth rework exists to remove — so
 * `useChat` no longer writes one. Answers reach storage exactly once, as part of the
 * conversation row Ask persists here.
 */

/**
 * Persists Ask's conversation to `recents_v1`, with a DELETED-WHILE-OPEN guard.
 *
 * THE SECOND-ORDER CASE (deleted while Ask was open). If the conversation
 * Ask holds was deleted from Recents while Ask stayed open, this hook STOPS PERSISTING IT
 * rather than recreating it.
 *
 * Reasoning, with the user's privacy ruling as the tiebreaker: recreating the row in
 * `recents_v1` is materially the same failure as the legacy resurrection, just one key
 * over. Ask's in-memory `conversation.chats` holds the FULL pre-delete transcript, so an
 * upsert would restore every answer the user explicitly deleted — not merely the one new
 * turn they just asked. "Delete deletes. Everywhere." (the delete rule, `recentsDelete.ts`)
 * cannot survive a path that restores deleted answer text from a stale React snapshot.
 * A delete the user watched succeed must not be undone by a window they forgot was open.
 *
 * What the user loses is narrow and non-destructive: the answer to a question they asked
 * in a window whose conversation no longer exists is still on screen and still copyable —
 * it just isn't filed into a conversation the user already threw away. Losing an unsaved
 * new answer is recoverable (ask again); resurrecting deleted answers is not.
 *
 * DETECTION — AND WHY IT IS NOT A SEPARATE CHECK. An earlier version of this hook read
 * storage to ask "does this conversation still exist?" and then called `recentsStore.update`
 * if it did. That is check-then-write: the two are separate awaits, and a delete landing
 * between them made `update` (an upsert) recreate the row — the exact resurrection this
 * hook exists to prevent, merely made less likely. Pin was worse: it consulted only a local
 * "was deleted" flag and never storage at all, so it unconditionally upserted a stale row.
 *
 * Both now write through `recentsStore.updateIfPresent`, which makes the existence test
 * and the write consume a SINGLE read inside one read-modify-write (`collection.ts`).
 * There is no await between the decision and the write, so no interleaving can separate
 * them: a conversation absent from storage cannot be recreated by a writer that predates
 * its deletion. The window is closed, not narrowed. `hasPersistedRef` is gone with it —
 * "is this row new or deleted?" is no longer a question this hook has to answer, because a
 * refused write reports itself (`written: false`) and a brand-new conversation goes through
 * `add`, which is allowed to insert.
 *
 * Once a refusal is observed, the guard LATCHES (`guard.deleted`): a conversation observed
 * as deleted stays un-persisted for the rest of this Ask session, so a later state tick
 * cannot re-open the window. The latch is now an optimization and a UX guarantee rather
 * than the safety mechanism — `updateIfPresent` is safe on its own.
 *
 * WRITE SERIALIZATION. Ask persists on every stream tick, so several writes for the same
 * conversation can be in flight at once with no ordering guarantee between them; a slower
 * write carrying an earlier partial answer could land after a faster one carrying the
 * finished answer and truncate it. `writeQueueRef` chains this session's writes so exactly
 * one is in flight at a time and each reads storage AFTER the previous one wrote. Storage
 * additionally refuses to shorten a transcript (`pickLongerTranscript` in `useRecents`),
 * which covers writers this queue cannot see — a second Ask window, or a Recents action.
 */
export function useAskConversation(existingConversation?: Conversation): {
  persist: (conversation: Conversation) => Promise<void>;
  /** Resolves true when the pin was written; false when the row was absent (deleted). */
  setPinned: (conversation: Conversation, pinned: boolean) => Promise<boolean>;
} {
  /**
   * Per-conversation write guards, keyed by conversation id. Each one answers two questions
   * about ITS conversation:
   *
   * - `written` — has this conversation ever been filed in storage? Not "has this hook
   *   instance written it": a conversation opened from Recents is seeded `true` (from
   *   `existingConversation`, ground truth available synchronously), so a write that later
   *   finds its row gone reads as "deleted in Recents" rather than "brand new" — the
   *   difference between respecting a deletion and resurrecting the conversation.
   * - `deleted` — latched once a write found the row gone, so nothing re-adds it.
   *
   * WHY A MAP AND NOT TWO REFS. The guards used to be two hook-wide refs, reset whenever
   * "Start New Conversation" swapped in a new id. But writes queue (`writeQueueRef`), and a
   * task for the OLD conversation could run after the reset: reading the new conversation's
   * `written: false`, it re-added a conversation the user had deleted; or setting
   * `deleted: true`, it blocked every write for the new one. Keying the guard by the id each
   * task captured means no task can ever read or write another conversation's state, so
   * there is nothing to reset.
   */
  const guardsRef = useRef(
    new Map<string, { written: boolean; deleted: boolean }>(
      existingConversation ? [[existingConversation.id, { written: true, deleted: false }]] : [],
    ),
  );
  const guardFor = useCallback((conversationId: string) => {
    let guard = guardsRef.current.get(conversationId);
    if (!guard) {
      guard = { written: false, deleted: false };
      guardsRef.current.set(conversationId, guard);
    }
    return guard;
  }, []);
  /**
   * Tail of this session's write chain. Every write appends to it, so exactly one is in
   * flight at a time and each one's read observes the previous one's write. Rejections are
   * swallowed into the chain so one failed write cannot poison every write after it.
   */
  const writeQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  /** Runs `task` after every write already queued for this session. */
  const enqueue = useCallback(<T>(task: () => Promise<T>): Promise<T> => {
    const next = writeQueueRef.current.then(task, task);
    writeQueueRef.current = next.catch(() => undefined);
    return next;
  }, []);

  const persist = useCallback(
    async (conversation: Conversation) => {
      const guard = guardFor(conversation.id);

      if (guard.deleted) return;

      // Nothing to file yet. A zero-chat conversation is also blocked from storage by
      // `recentsStore`'s `persistFilter`, so this is an early exit, not the only guard.
      if ((conversation.chats ?? []).length === 0) return;

      await enqueue(async () => {
        // Re-checked inside the queue: an earlier queued write may have latched the guard
        // while this one was waiting its turn.
        if (guard.deleted) return;

        // ONE read-modify-write decides existence AND writes. A row absent from storage is
        // not recreated; a row present is updated with the field-ownership and
        // transcript-growth rules the store applies (`useRecents`'s `mergeOnUpdate`).
        const { written } = await recentsStore.updateIfPresent(conversation);
        if (written) {
          guard.written = true;
          return;
        }

        // Not written. Either this conversation is brand new and has never been filed, or
        // it HAS existed in storage and is gone now — deleted, either in this session or
        // before this view ever mounted. `guard.written` is what separates those,
        // and it is seeded from `existingConversation` precisely so that a conversation
        // opened from Recents counts as "has existed" on a FRESH mount, where a
        // write-tracking-only flag would have said "brand new" and re-added it.
        if (await conversationExists(conversation.id)) {
          // Present but not written means `persistFilter` rejected it, not a deletion.
          return;
        }

        if (guard.written) {
          // This row has been in storage and is not there now: it was deleted. Do NOT
          // re-add it. "Delete deletes. Everywhere." — restoring the pre-delete transcript
          // from a stale React snapshot is the resurrection this hook exists to prevent.
          guard.deleted = true;
          return;
        }

        await recentsStore.add(conversation);
        guard.written = true;
      });
    },
    [enqueue, guardFor],
  );

  /**
   * "Pin Conversation" — a PIN on the containing conversation in `recents_v1`.
   *
   * WHY THIS MOVED. The action used to `add` a copy of the answer to the legacy
   * `savedChats` key. With that key retired, nothing reads it, so the action would have
   * become a silent no-op — a button that reports "Answer saved!" and saves nothing,
   * which is the same class of UI-lying-about-state defect this rework exists to close.
   *
   * Pinning the conversation is the honest equivalent and requires no new storage
   * concept: `savedChats.saved_at` was ALREADY how a saved answer expressed itself after
   * migration — `mergeIntoRecents` transferred it to the containing conversation's
   * `pinned_at` (rule 2). Writing `pinned_at` directly is that same outcome without the
   * intermediate key, and the result is visible in Recents' Pinned section immediately.
   *
   * `unpinned_at` is deliberately cleared: an explicit save is a newer decision than any
   * previous unpin, and leaving a later `unpinned_at` in place would let `resolvePinState`
   * conclude the conversation is still unpinned — the save would appear to do nothing.
   */
  const setPinned = useCallback(
    async (conversation: Conversation, pinned: boolean): Promise<boolean> => {
      const guard = guardFor(conversation.id);
      if (guard.deleted) return false;

      return enqueue(async () => {
        if (guard.deleted) return false;

        const now = new Date().toISOString();
        // SAME GUARANTEE AS `persist`, and it did not have one before: `pin` used to
        // consult `guard.deleted` alone — a local ref that knows nothing about storage —
        // and then call `update`, an upsert. Pinning a conversation the user had deleted in
        // Recents therefore recreated it wholesale, transcript included, without ever
        // reading storage. `updateIfPresent` makes the row's presence the write's own
        // precondition.
        //
        // Unlike `persist`, there is NO `add` fallback here: pinning is only ever an action
        // on a conversation the user is looking at, which by definition Ask has already
        // filed. A pin that finds no row has nothing legitimate to insert.
        // Unpinning writes `unpinned_at` rather than merely clearing `pinned_at`: a
        // migrated conversation re-derives its `pinned_at`, so a cleared field alone would
        // be undone before the user saw it. Same rule as Recents' own toggle.
        const { written } = await recentsStore.updateIfPresent({
          ...conversation,
          pinned,
          pinned_at: pinned ? now : undefined,
          unpinned_at: pinned ? undefined : now,
        });

        if (!written) {
          // Absent — deleted while Ask stayed open, or never filed. Latch and report the
          // failure so the caller's toast tells the truth instead of claiming a save that
          // did not happen.
          //
          // SAME FRESH-MOUNT HOLE AS `persist`, fixed by the same seed. Pin never had an
          // `add` fallback, so this path could not itself resurrect a row — but before the
          // seed, `guard.written` was `false` on a fresh view of a pre-existing
          // conversation, so a refused pin failed to LATCH. The pin correctly reported
          // false while leaving the guard open, and the very next `persist` tick — which
          // does have an `add` fallback — resurrected the conversation the user had just
          // deleted. The latch now fires on the first refusal in that case, which is what
          // makes the two paths consistent rather than merely both "safe-looking".
          if (guard.written) guard.deleted = true;
          return false;
        }

        guard.written = true;
        return true;
      });
    },
    [enqueue, guardFor],
  );

  return { persist, setPinned };
}

/**
 * Whether `conversationId` is present in `recents_v1` right now.
 *
 * Reads the key directly rather than through `recentsStore.read()` because `read()`
 * applies `transformOnRead` over every conversation's chats — needless work for an
 * existence check that runs on every Ask state change. A corrupt or absent key answers
 * "no row exists", which correctly makes the caller treat an already-persisted
 * conversation as deleted rather than rewriting it over data it cannot parse.
 */
async function conversationExists(conversationId: string): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(RECENTS_KEY);
  if (raw === undefined) return false;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    return parsed.some((row) => typeof row === "object" && row !== null && row.id === conversationId);
  } catch {
    return false;
  }
}
