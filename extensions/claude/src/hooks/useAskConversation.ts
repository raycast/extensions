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
 * hook exists to prevent, merely made less likely. Pin was worse: it consulted only
 * `wasDeletedRef`, a local ref, and never storage at all, so it unconditionally upserted a
 * stale row.
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
 * Once a refusal is observed, the guard LATCHES (`wasDeletedRef`): a conversation observed
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
  wasDeleted: () => boolean;
} {
  /** Latches once a write is refused because the row is gone from storage. */
  const wasDeletedRef = useRef(false);
  /**
   * Whether this conversation HAS EVER BEEN FILED IN STORAGE — not merely whether this
   * hook instance has written it.
   *
   * THE DISTINCTION, AND WHY IT IS THE WHOLE FIX . This used to be
   * `useRef(false)` on a hook that took no arguments, which made it mean "has this hook
   * instance written yet." Those two readings agree only when Ask CREATED the
   * conversation. They diverge in the most common way a user reaches an existing
   * conversation: opening it from Recents. That is a fresh mount, so the ref started
   * `false` even though the row had been in `recents_v1` for days — and if the user then
   * deleted it in Recents, the next persist walked straight past the "it was deleted,
   * don't re-add it" guard below and called `add`, putting the conversation and every
   * answer the user had just deleted back on disk.
   *
   * The seed closes that. `existingConversation` is `ask.tsx`'s `props.conversation`,
   * which is set if and only if Ask was HANDED a conversation that predates the view —
   * ground truth about prior existence, available synchronously at construction time, with
   * no extra storage read. Seeding the latch `true` for that case makes a refused write on
   * a pre-existing conversation read as "deleted" (correct: it was in storage, now it is
   * not) instead of "brand new" (wrong, and the resurrection).
   *
   * THE GENUINELY-NEW CASE STILL WORKS, and that is the constraint this seed had to
   * respect. Ask creating its own conversation passes nothing here, so the ref starts
   * `false` exactly as before: the first persist finds no row, falls through to `add`, and
   * the conversation is filed. Nothing else could file it, so getting this wrong would
   * mean Ask never saves anything — which is why the seed is keyed on the caller's own
   * prop rather than on a storage probe that a race could answer "absent" for.
   */
  const hasEverBeenWrittenRef = useRef(existingConversation !== undefined);
  /**
   * WHICH conversation the latch above describes.
   *
   * The latch answers "has this conversation ever been in storage?", but it lives on the
   * hook, and "Start New Conversation" (`src/views/chat.tsx`) swaps in a fresh `uuidv4()`
   * WITHOUT remounting — same hook, different conversation. Left alone, the latch stayed
   * `true` from the previous conversation, so the new one's first write found no row,
   * concluded it had been deleted, and refused to add it: the answer rendered and was
   * never saved. Silent loss, on the ordinary path from Recents.
   *
   * Tracking the id makes the latch follow the conversation it actually describes.
   */
  const latchedConversationIdRef = useRef(existingConversation?.id);
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
      // FIRST, before any guard reads those flags. "Start New Conversation"
      // (`src/views/chat.tsx`) swaps in a fresh `uuidv4()` without remounting this hook, so
      // both flags still describe the PREVIOUS conversation. Checking `wasDeletedRef` ahead
      // of this would make a new conversation started after deleting one permanently
      // unsaveable — the same silent-loss bug this reset exists to fix, one step over.
      if (latchedConversationIdRef.current !== conversation.id) {
        latchedConversationIdRef.current = conversation.id;
        hasEverBeenWrittenRef.current = false;
        wasDeletedRef.current = false;
      }

      if (wasDeletedRef.current) return;

      // Nothing to file yet. A zero-chat conversation is also blocked from storage by
      // `recentsStore`'s `persistFilter`, so this is an early exit, not the only guard.
      if ((conversation.chats ?? []).length === 0) return;

      await enqueue(async () => {
        // Re-checked inside the queue: an earlier queued write may have latched the guard
        // while this one was waiting its turn.
        if (wasDeletedRef.current) return;

        // ONE read-modify-write decides existence AND writes. A row absent from storage is
        // not recreated; a row present is updated with the field-ownership and
        // transcript-growth rules the store applies (`useRecents`'s `mergeOnUpdate`).
        const { written } = await recentsStore.updateIfPresent(conversation);
        if (written) {
          hasEverBeenWrittenRef.current = true;
          return;
        }

        // Not written. Either this conversation is brand new and has never been filed, or
        // it HAS existed in storage and is gone now — deleted, either in this session or
        // before this view ever mounted. `hasEverBeenWrittenRef` is what separates those,
        // and it is seeded from `existingConversation` precisely so that a conversation
        // opened from Recents counts as "has existed" on a FRESH mount, where a
        // write-tracking-only flag would have said "brand new" and re-added it.
        if (await conversationExists(conversation.id)) {
          // Present but not written means `persistFilter` rejected it, not a deletion.
          return;
        }

        if (hasEverBeenWrittenRef.current) {
          // This row has been in storage and is not there now: it was deleted. Do NOT
          // re-add it. "Delete deletes. Everywhere." — restoring the pre-delete transcript
          // from a stale React snapshot is the resurrection this hook exists to prevent.
          wasDeletedRef.current = true;
          return;
        }

        await recentsStore.add(conversation);
        hasEverBeenWrittenRef.current = true;
      });
    },
    [enqueue],
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
      if (wasDeletedRef.current) return false;

      return enqueue(async () => {
        if (wasDeletedRef.current) return false;

        const now = new Date().toISOString();
        // SAME GUARANTEE AS `persist`, and it did not have one before: `pin` used to
        // consult `wasDeletedRef` alone — a local ref that knows nothing about storage —
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
          // seed, `hasEverBeenWrittenRef` was `false` on a fresh view of a pre-existing
          // conversation, so a refused pin failed to LATCH. The pin correctly reported
          // false while leaving the guard open, and the very next `persist` tick — which
          // does have an `add` fallback — resurrected the conversation the user had just
          // deleted. The latch now fires on the first refusal in that case, which is what
          // makes the two paths consistent rather than merely both "safe-looking".
          if (hasEverBeenWrittenRef.current) wasDeletedRef.current = true;
          return false;
        }

        hasEverBeenWrittenRef.current = true;
        return true;
      });
    },
    [enqueue],
  );

  const wasDeleted = useCallback(() => wasDeletedRef.current, []);

  return { persist, setPinned, wasDeleted };
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
