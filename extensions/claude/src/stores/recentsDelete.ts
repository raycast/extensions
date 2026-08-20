import { LocalStorage } from "@raycast/api";
import type { Chat, Conversation, SavedChat } from "../type";
import { CONVERSATIONS_KEY, HISTORY_KEY, RECENTS_KEY, SAVED_CHATS_KEY } from "./recentsKeys";
import { bumpRecentsGeneration, runRecentsMigration } from "./recentsMigration";

/**
 * THE RULING (decided by the user):
 *
 * Delete deletes. Everywhere. No tombstones.
 *
 * Clearing only `recents_v1` while leaving a conversation's text elsewhere on disk is a
 * privacy failure, not a safety feature. This supersedes the original "never write to
 * legacy keys" constraint for the delete path.
 *
 * WHAT CHANGED IN FIX-WAVE 6 — the legacy keys are RETIRED, not merely swept.
 *
 * Codex found that the sweeping done here could not, on its own, close the resurrection
 * hole, because the legacy keys remained a live SECOND SOURCE OF TRUTH: the migration
 * re-derived from them on every Recents mount and Ask kept writing to them, so a deleted
 * conversation could be written back and re-derived into existence — including answers
 * the user explicitly deleted.
 *
 * That root cause is now removed rather than defended (`recentsRetirement.ts`): after the
 * migration verifies its `recents_v1` write, the three legacy keys are DELETED, and Ask
 * writes to `recents_v1` directly (`src/hooks/useAskConversation.ts`). `recents_v1` is
 * the single source of truth.
 *
 * The legacy sweeping below is therefore no longer the load-bearing part of delete — but
 * it is deliberately KEPT, because retirement is a convergence, not an instant: a user
 * mid-upgrade, or one whose old build wrote to a legacy key after retirement, can still
 * have legacy rows present when a delete runs. Sweeping them here means a delete is
 * correct in that window too, and is a no-op once the keys are gone.
 *
 * THE DELETED-WHILE-OPEN CASE is now handled, in Ask. `useAskConversation` checks whether
 * its conversation still exists in `recents_v1` before persisting, and stops persisting
 * (latching) once it observes the row is gone — so a still-open Ask window can no longer
 * restore a deleted transcript to `recents_v1` either. See that hook's docstring for the
 * ruling and its reasoning.
 */

/**
 * Opaque proof that `runRecentsMigration()` has run AND verified in this process. The
 * ONLY way to construct one is `verifyMigrationForDelete` below, which calls the real
 * migration and only returns a token once it resolves without throwing. `deleteRecent`
 * and `clearAllRecents` both require this token as their first argument and use it for
 * nothing but its existence — TypeScript's structural typing would let any object
 * through if the field were exported or the type were a plain `{ verified: true }`
 * literal a caller could hand-roll, so the brand field is a `unique symbol` that is
 * NOT exported. Nothing outside this module can construct a value assignable to
 * `MigrationVerifiedToken` other than by calling `verifyMigrationForDelete`, which makes
 * "migration verified first" a compile-time property of the delete path rather than a
 * comment a future edit could silently stop honoring.
 */
declare const verifiedBrand: unique symbol;
export type MigrationVerifiedToken = { readonly [verifiedBrand]: true };

/**
 * Runs the real migration commit protocol (`runRecentsMigration`, Task 5) and mints a
 * `MigrationVerifiedToken` only if it resolves without throwing. `runRecentsMigration`
 * itself throws if its write doesn't verify by re-read (Task 5's commit protocol), so a
 * failed or unverified migration propagates as a rejected promise here and no token is
 * ever produced — a delete call site that doesn't await this successfully has no token
 * to pass, and `deleteRecent`/`clearAllRecents` are typed to require one. This is the
 * "structural, not a comment" enforcement the brief requires: there is no code path that
 * reaches a delete without this function's promise having resolved first.
 */
export async function verifyMigrationForDelete(): Promise<MigrationVerifiedToken> {
  await runRecentsMigration();
  return {} as MigrationVerifiedToken;
}

async function readJsonArray<T>(key: string): Promise<T[]> {
  const raw = await LocalStorage.getItem<string>(key);
  if (raw === undefined) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // A corrupt legacy key has nothing coherent to remove a row from; treat it as
    // already-empty for this key rather than throwing and aborting the rest of the
    // delete. `runRecentsMigration` already ran (the token proves it) and takes the same
    // tolerant stance on corrupt legacy keys.
    return [];
  }
}

/**
 * Removes every chat belonging to `conversationId` from `history` and `savedChats`,
 * matched precisely by chat id — the id set of the conversation's OWN `chats`, not a
 * blanket key wipe. A row in `history`/`savedChats` whose id isn't in `chatIds` belongs
 * to a different conversation (or is a legitimate orphan the migration will keep
 * surfacing) and must survive untouched.
 */
async function removeChatsFromLegacyKeys(chatIds: ReadonlySet<string>): Promise<void> {
  if (chatIds.size === 0) return;

  await Promise.all([pruneLegacyKey<Chat>(HISTORY_KEY, chatIds), pruneLegacyKey<SavedChat>(SAVED_CHATS_KEY, chatIds)]);
}

/**
 * Removes the matching chat rows from one legacy key — but ONLY if that key still exists.
 *
 * The absence check is load-bearing, not an optimization. These keys are RETIRED
 * (`recentsRetirement.ts`), and `verifyMigrationForDelete` — which every delete must call
 * first — is what retires them. Unconditionally writing a filtered array back would
 * therefore RECREATE a key that retirement had just deleted, on every single delete:
 * `recents_v1` would gain a permanent empty-array shadow of the very second source of
 * truth this fix-wave removed, and `isRetirementComplete` would keep seeing legacy keys
 * present. Writing nothing when there is nothing there keeps retirement durable.
 */
async function pruneLegacyKey<T extends { id: string }>(key: string, chatIds: ReadonlySet<string>): Promise<void> {
  const raw = await LocalStorage.getItem<string>(key);
  // Retired (or never present) — nothing to prune, and nothing to recreate.
  if (raw === undefined) return;

  const rows = await readJsonArray<T>(key);
  const next = rows.filter((row) => !chatIds.has(row.id));
  // Unchanged: skip the write entirely rather than rewriting an identical payload.
  if (next.length === rows.length) return;

  await LocalStorage.setItem(key, JSON.stringify(next));
}

/**
 * Deletes one conversation from `recents_v1` and its chats from `history` +
 * `savedChats`, matched by chat id. `conversations` (the legacy key) is also swept for
 * the same conversation id, since a not-yet-migrated legacy conversation row could still
 * be sitting there (the migration never deletes it — see `recentsMigration.ts`) and
 * would otherwise be re-derived on the next mount even though `recents_v1` no longer has
 * it.
 *
 * Requires a `MigrationVerifiedToken` — see its docstring. Read-modify-write against
 * freshly read storage, per this codebase's global constraint (never a stale React
 * snapshot).
 */
export async function deleteRecent(token: MigrationVerifiedToken, conversationId: string): Promise<Conversation[]> {
  // The token's only job is to exist (see its docstring) — this reference is purely to
  // keep it a used parameter under lint, not a runtime check.
  void token;
  const [recents, legacyConversations] = await Promise.all([
    readJsonArray<Conversation>(RECENTS_KEY),
    readJsonArray<Conversation>(CONVERSATIONS_KEY),
  ]);

  const target =
    recents.find((c) => c.id === conversationId) ?? legacyConversations.find((c) => c.id === conversationId);
  const chatIds = new Set<string>((target?.chats ?? []).map((chat) => chat.id));
  // The conversation id itself is also a valid chat id for a synthesized one-turn
  // conversation (`recentsMigration.ts`'s orphan handling gives the synthesized row the
  // SAME id as the lone chat it wraps) — include it so that shape's own history/saved
  // rows are matched even if `target.chats` is empty or the row was only found in one of
  // the two sources.
  //
  // Two accepted, documented edge cases in this `chatIds` set, both requiring a shape
  // `uuidv4()` (`src/hooks/useChat.tsx`) never produces in practice, and both the same
  // class of accepted tie-break `recentsMigration.ts` already documents for id
  // collisions elsewhere in this merge:
  // 1. If a conversation's own id happens to collide with an UNRELATED chat's id
  //    elsewhere in `history`/`savedChats`, that unrelated chat is deleted too —
  //    `chatIds.add(conversationId)` above can't distinguish "this id is the
  //    synthesized conversation's own lone-chat id" from "this id happens to collide
  //    with a real UUID".
  // 2. If the SAME chat id is (incorrectly) present in two different conversations'
  //    `chats` arrays, deleting one conversation removes that chat id from
  //    `history`/`savedChats` entirely, orphaning the sibling conversation's copy (its
  //    `chats` array keeps the row — only the legacy `history`/`savedChats` copies are
  //    id-matched and removed).
  // Both require a uuid collision, which `uuidv4()` does not produce; not solved
  // structurally, same as the migration's documented tie-breaks.
  chatIds.add(conversationId);

  const nextRecents = recents.filter((c) => c.id !== conversationId);
  const nextLegacyConversations = legacyConversations.filter((c) => c.id !== conversationId);

  // Bump the generation counter as part of writing `recents_v1` (CRITICAL B). A migration
  // that read `recents_v1` BEFORE this delete will re-read the counter before committing,
  // see it has moved, and discard its now-stale payload instead of writing the deleted
  // conversation back. Without this bump the delete is invisible to that check and the
  // stale migration silently resurrects the row — which is exactly the sequence Codex
  // identified, and which the migration's own verify-by-re-read cannot catch, because it
  // only confirms the stale write itself landed.
  await bumpRecentsGeneration();

  await Promise.all([
    LocalStorage.setItem(RECENTS_KEY, JSON.stringify(nextRecents)),
    // Same never-recreate-a-retired-key rule as `pruneLegacyKey`: only write
    // `conversations` back if it still exists. `legacyConversations` reads as `[]` for a
    // retired key, so an unconditional write would resurrect it as an empty array.
    writeIfPresent(CONVERSATIONS_KEY, nextLegacyConversations),
    removeChatsFromLegacyKeys(chatIds),
  ]);

  return nextRecents;
}

/** Writes `rows` to `key` only if `key` still exists — never recreating a retired key. */
async function writeIfPresent<T>(key: string, rows: T[]): Promise<void> {
  if ((await LocalStorage.getItem<string>(key)) === undefined) return;
  await LocalStorage.setItem(key, JSON.stringify(rows));
}

/**
 * `createCollectionStore`'s corrupt-value rescue (`collection.ts`'s `pickCorruptSideKey`)
 * copies a key's raw, unparseable value under `<key>__corrupt_<ISO-timestamp>[_<n>]`
 * before repairing the key itself — by design, so a corruption event never destroys data.
 * For `recents_v1`/`conversations`/`history`/`savedChats`, that raw value can be a chat's
 * question/answer text. THE RULING's rationale is privacy: a delete that leaves the
 * content readable elsewhere on disk is a broken promise. Clear-all is the point where
 * that applies to these side-keys too — leaving them behind after "delete everywhere"
 * would mean rescued chat text outlives the very delete that was supposed to remove it.
 * Matched by exact prefix per key, so this can only ever remove a rescue side-key for one
 * of these four specific keys — never `presets_seeded_v1` or any other extension key.
 */
function isCorruptSideKeyFor(key: string, candidate: string): boolean {
  return candidate.startsWith(`${key}__corrupt_`);
}

/**
 * Clear-all: empties `recents_v1` and all three legacy keys outright, and sweeps any
 * corrupt-value rescue side-keys those four keys may have left behind (see
 * `isCorruptSideKeyFor`'s docstring for why). Same token requirement and same reasoning
 * as `deleteRecent` — see its docstring and the module docstring above for why this
 * supersedes Task 5's legacy-key constraint here only.
 */
export async function clearAllRecents(token: MigrationVerifiedToken): Promise<Conversation[]> {
  void token;

  const allKeys = Object.keys(await LocalStorage.allItems());
  const sweepableKeys = [RECENTS_KEY, CONVERSATIONS_KEY, HISTORY_KEY, SAVED_CHATS_KEY];
  const sideKeysToRemove = allKeys.filter((candidate) =>
    sweepableKeys.some((key) => isCorruptSideKeyFor(key, candidate)),
  );

  // Same generation bump as `deleteRecent` — a clear-all is the most destructive write
  // there is, and a stale migration must not be able to repopulate `recents_v1` after it.
  await bumpRecentsGeneration();

  await Promise.all([
    LocalStorage.setItem(RECENTS_KEY, JSON.stringify([])),
    // REMOVED, not emptied. Writing `[]` here would recreate the retired legacy keys as
    // empty arrays — leaving the second source of truth present-but-empty forever, and
    // making `anyLegacyKeyPresent`/`isRetirementComplete` permanently disagree with
    // reality. `removeItem` on an already-retired key is a no-op, so this is safe either
    // way, and it satisfies THE RULING more completely than emptying does.
    ...[CONVERSATIONS_KEY, HISTORY_KEY, SAVED_CHATS_KEY].map((key) => LocalStorage.removeItem(key)),
    ...sideKeysToRemove.map((key) => LocalStorage.removeItem(key)),
  ]);
  return [];
}
