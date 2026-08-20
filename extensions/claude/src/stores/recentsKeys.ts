/**
 * The LocalStorage key names for the Recents data model, and nothing else.
 *
 * WHY THIS MODULE EXISTS — it breaks a real circular import. `recentsMigration` needs
 * `retireLegacyKeys` (it retires the legacy keys after verifying its write) and
 * `recentsRetirement` needs the key NAMES. With both living in `recentsMigration`, the
 * two modules imported each other, and a cycle makes module initialization order
 * load-bearing: whichever module is imported first sees the other only partially
 * evaluated. That surfaced as a test where `recentsRetirement` captured a different
 * `LocalStorage` binding than `recentsMigration` did, purely because of import order —
 * a genuine fragility, not a test artifact, and exactly the kind of thing that produces
 * a bug reproducible only in one command's bundle.
 *
 * A leaf module with no imports of its own cannot participate in a cycle. Every consumer
 * of these names imports them from here.
 */

export const RECENTS_KEY = "recents_v1";
export const CONVERSATIONS_KEY = "conversations";
export const HISTORY_KEY = "history";
export const SAVED_CHATS_KEY = "savedChats";

/**
 * Monotonic write counter for `recents_v1`, bumped by EVERY writer of that key. See
 * `recentsMigration.ts`'s `commitRecentsIfUnchanged` for the full rationale — it is the
 * generation check that stops a stale migration write from resurrecting a deleted row or
 * erasing a Recents action.
 */
export const RECENTS_GENERATION_KEY = "recents_v1_generation";

/** The three legacy keys retired by `recentsRetirement.ts`, in one place so nothing drifts. */
export const LEGACY_KEYS = [CONVERSATIONS_KEY, HISTORY_KEY, SAVED_CHATS_KEY] as const;
