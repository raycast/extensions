import { LocalStorage } from "@raycast/api";
import type { Chat, Conversation, SavedChat } from "../type";
import { DEFAULT_MODEL } from "../hooks/useModel";
import { createCollectionStore } from "./collection";
import { CONVERSATIONS_KEY, HISTORY_KEY, RECENTS_GENERATION_KEY, RECENTS_KEY, SAVED_CHATS_KEY } from "./recentsKeys";
import { retireLegacyKeys, verifyPayloadRoundTrip } from "./recentsRetirement";

// The key names live in a LEAF module (`recentsKeys.ts`) so this module and
// `recentsRetirement.ts` — which import each other's behavior — do not form an import
// cycle. Re-exported here so every existing `from "./recentsMigration"` import of a key
// name keeps working.
export { CONVERSATIONS_KEY, HISTORY_KEY, RECENTS_GENERATION_KEY, RECENTS_KEY, SAVED_CHATS_KEY };

/**
 * Monotonic write counter for `recents_v1`, bumped by EVERY writer of that key
 * (`runRecentsMigration` here, and `deleteRecent`/`clearAllRecents` in
 * `recentsDelete.ts`). This is the generation check that closes the two write-ordering
 * defects described below.
 *
 * THE BUG IT CLOSES. Per-key read-modify-write was mistaken for a multi-key transaction:
 *
 *   migration reads recents_v1 (contains X)
 *   -> deleteRecent removes X and writes recents_v1
 *   -> the stale migration writes ITS payload back, containing X again
 *
 * The migration's verify-by-re-read did not catch this, because it only confirmed that
 * the stale write itself landed — which it did. Verification of one's own write says
 * nothing about whether a concurrent writer's change was clobbered in the process.
 *
 * The same shape erases a Recents action: an archive/rename/unpin landing
 * between a migration's read and its whole-key write is overwritten by the stale payload.
 *
 * THE FIX: every writer reads this counter alongside `recents_v1`, and before committing
 * re-reads it. If it moved, someone else wrote in the meantime, so the payload in hand is
 * stale — the writer re-reads and recomputes rather than committing. Because the
 * migration is idempotent and its reconcile is additive, recomputing converges; it does
 * not loop indefinitely (`MAX_COMMIT_ATTEMPTS` bounds it regardless).
 *
 * This is a check-and-retry against a version counter, not a lock — LocalStorage offers
 * no compare-and-swap.
 *
 * THE RESIDUAL WINDOW, stated exactly rather than claimed closed. Every writer now
 * announces BEFORE it writes (`withGenerationBump`), and `commitRecentsIfUnchanged`
 * re-reads the counter immediately before its `setItem` rather than only at the top. What
 * remains is the gap between that final re-read resolving and the `setItem(RECENTS_KEY)`
 * that follows it — a single await, no I/O in between. A writer whose bump lands inside
 * that gap is not detected, and its write is overwritten by the migration's payload.
 *
 * Closing it entirely requires a compare-and-swap the platform does not expose. What
 * bounds the damage in practice: the migration only runs on a Recents mount, its payload
 * is a reconcile of what it just read (not an arbitrary older state), and the fields a
 * concurrent Recents action would lose are the `RECENTS_OWNED_FIELDS` the reconcile
 * preserves anyway. A deletion racing into that gap is the genuinely lossy case, and it
 * requires the delete's bump to land in a sub-millisecond window in another process.
 */
// (The constant itself lives in `recentsKeys.ts` and is re-exported above.)

/** Bounds the recompute-on-conflict loop. A conflict means another writer committed; in
 *  practice one retry suffices, and the app must never spin here. */
const MAX_COMMIT_ATTEMPTS = 5;

/** Reads the current generation counter. Absent or corrupt reads as 0. */
export async function readGeneration(): Promise<number> {
  const raw = await LocalStorage.getItem<string>(RECENTS_GENERATION_KEY);
  if (raw === undefined) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Bumps the generation counter unconditionally. Used by writers that are NOT re-deriving
 * from a snapshot and so have nothing to conflict-check — a delete, a clear-all, or a
 * Recents action (`recentsStore`'s read-modify-write, which re-reads storage immediately
 * before writing and therefore cannot itself be stale).
 *
 * Their obligation is the mirror of the migration's: not to detect a conflict, but to
 * ANNOUNCE their write so a migration holding an older snapshot can detect it. A writer
 * that skips this bump is invisible to the conflict check and its change can be silently
 * overwritten or its deletion undone.
 */
export async function bumpRecentsGeneration(): Promise<void> {
  const current = await readGeneration();
  await LocalStorage.setItem(RECENTS_GENERATION_KEY, String(current + 1));
}

/**
 * Runs `write` with the generation bumped BEFORE it, not after.
 *
 * THE BUG THIS CLOSES . `recentsStore`'s mutations used to write
 * `recents_v1` and bump the counter afterwards:
 *
 *   Recents action writes recents_v1 (archives X)
 *   -> a migration holding an older snapshot re-reads the generation, sees it UNCHANGED,
 *      and commits its stale payload — erasing the archive
 *   -> the action's bump finally lands, announcing a write that has already been lost.
 *
 * A bump that follows its write announces the change too late to defend it. Bumping first
 * makes the announcement strictly precede the change it describes, so a migration that
 * samples the counter at any point after the bump treats its own snapshot as stale.
 *
 * THE TRADE, stated honestly: bumping first means a write that then FAILS leaves the
 * counter ahead of the data, so a concurrent migration discards a payload it could have
 * safely written and recomputes. That costs one redundant idempotent retry. The reverse
 * ordering costs a silently lost user action. This is the same "counter ahead of data is
 * the safe direction" reasoning `commitRecentsIfUnchanged` already applies to its own two
 * writes, applied consistently to the store's writers.
 */
export async function withGenerationBump<T>(write: () => Promise<T>): Promise<T> {
  await bumpRecentsGeneration();
  return write();
}

/**
 * Writes `payload` to `recents_v1` and bumps the generation counter, but ONLY if the
 * generation has not moved since `expectedGeneration` was read. Returns false when it
 * has — the caller's payload is stale and must be recomputed from a fresh read.
 *
 * The generation bump is written BEFORE the payload. If a crash lands between the two,
 * the counter is ahead of the data, which makes the next writer treat its own in-hand
 * read as stale and recompute — the safe direction. The reverse ordering (payload first)
 * would let a crash leave a committed payload that no other writer knows happened.
 */
export async function commitRecentsIfUnchanged(payload: string, expectedGeneration: number): Promise<boolean> {
  const actual = await readGeneration();
  if (actual !== expectedGeneration) return false;

  // Claim the next generation BEFORE writing the payload, so a concurrent writer sampling
  // the counter from here on treats its own snapshot as stale.
  await LocalStorage.setItem(RECENTS_GENERATION_KEY, String(expectedGeneration + 1));

  // RE-READ AND COMPARE, immediately before the write. LocalStorage has no compare-and-set,
  // so this is not a lock — but it is the difference between check-and-set (sample the
  // counter, do other I/O, then write regardless) and a final confirmation taken as late as
  // it can be taken. Between the check above and this point sits a `setItem` round-trip;
  // another writer bumping in that span would otherwise go unnoticed and its change would
  // be overwritten by the payload below. Discarding our payload here is the safe direction:
  // the migration is idempotent, so the caller recomputes against fresh state and converges.
  //
  // The value we expect to see is our OWN claim (`expectedGeneration + 1`). Anything else
  // means someone wrote in between.
  const afterClaim = await readGeneration();
  if (afterClaim !== expectedGeneration + 1) return false;

  await LocalStorage.setItem(RECENTS_KEY, payload);
  return true;
}

/**
 * True for a row that is "well-formed enough to keep": a non-null object carrying a
 * usable (non-empty string) `id`. This is deliberately NOT full validation — a row with
 * a valid `id` but a missing `answer`, `question`, or `created_at` still passes, because
 * those already survive migration today (a blank/omitted answer is a real shape a failed
 * request can leave behind) and tightening the bar here would be new data loss, not a
 * fix. The bar is narrowly "won't crash the join": every access point in
 * `mergeIntoRecents` below either reads `.id` (needs it to exist and be a string to key
 * a `Map` sensibly — an empty-string id would silently collide rows against each other)
 * or reads `.chats`/`.saved_at`/etc. off an object that is guaranteed non-null once this
 * filter has run.
 */
function isWellFormedRow(value: unknown): value is { id: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0;
}

/**
 * What `readLegacyKey` understood about a key: the rows it could use, plus whether ANY
 * part of the stored value was not fully understood.
 *
 * `fullyUnderstood: false` means at least one of: the value was unparseable JSON, it
 * parsed to something that is not an array, or at least one array element was dropped by
 * `isWellFormedRow`. In every one of those cases the raw string holds bytes the migration
 * is about to carry forward only partially — and retirement is about to delete that key.
 * See `rescueUnreadableLegacyKeys` for what happens next.
 */
type LegacyKeyRead<T> = {
  rows: T[];
  /** True only when every byte of the stored value was parsed AND every row was kept. */
  fullyUnderstood: boolean;
  /** The exact stored string, kept so the panic-case rescue can preserve it verbatim. */
  raw: string | undefined;
};

/**
 * Reads a legacy collection key directly, with no `transformOnRead`/`persistFilter`
 * side effects — the migration must see the RAW stored shape (including rows a live
 * store's `persistFilter` would normally hide, e.g. a `chats: []` conversation
 * predating that filter). Tolerates a missing or corrupt key by
 * contributing no rows; a migration must never throw on a legacy key another command
 * left in a bad state.
 *
 * Also filters individual array ELEMENTS down to well-formed rows (`isWellFormedRow`).
 * A stray `null`/non-object/no-id element inside an otherwise-valid array passes both
 * `JSON.parse` and `Array.isArray` — the whole-key corruption guard never sees it — and
 * would otherwise crash deeper in `mergeIntoRecents` the first time something reads
 * `.id`/`.chats` off it. Filtering here, at the single parse boundary every legacy key
 * passes through, keeps the tolerance uniform: everything downstream of `readLegacyKey`
 * can assume every row it sees is a well-formed object with a usable `id`, with no
 * scattered null checks needed at each use site.
 *
 * WHY THIS RETURNS `fullyUnderstood` RATHER THAN JUST ROWS — THE PANIC CASE.
 * This function's tolerance used to be justified by a comment claiming "the store already
 * owns rescuing corrupt data on the legacy key's own read path." That reasoning was TRUE
 * when the legacy keys were live, and became STALE the moment `recentsRetirement.ts`
 * landed: after retirement the legacy keys have NO read path at all, so the rescue this
 * function was deferring to can never run. The sequence that reasoning permitted was:
 *
 *   `conversations` holds truncated JSON  ->  readLegacyKey returns []
 *   ->  the migration derives, commits, and VERIFIES an empty/partial `recents_v1`
 *   ->  `retireLegacyKeys` deletes `conversations`
 *   ->  the raw bytes are gone from disk, permanently, with nothing rescued.
 *
 * Reporting `fullyUnderstood` instead of silently returning `[]` is what lets
 * `runRecentsMigration` preserve the raw value BEFORE anything deletes the key. The rescue
 * itself reuses `collection.ts`'s `<key>__corrupt_<ISO>` side-key convention rather than
 * inventing a second one (see `rescueRawValue`).
 */
async function readLegacyKey<T extends { id: string }>(key: string): Promise<LegacyKeyRead<T>> {
  const raw = await LocalStorage.getItem<string>(key);
  if (raw === undefined) return { rows: [], fullyUnderstood: true, raw: undefined };

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      // Valid JSON, wrong shape. Nothing usable to contribute, and nothing downstream can
      // interpret it — so the raw bytes are all that survives, and they must be kept.
      return { rows: [], fullyUnderstood: false, raw };
    }
    const rows = parsed.filter(isWellFormedRow) as T[];
    // A partially-readable key: the well-formed rows ARE migrated (they are real data and
    // dropping them would be its own loss), but the key is still not fully understood, so
    // its raw value is preserved too. Nothing is lost in either direction.
    return { rows, fullyUnderstood: rows.length === parsed.length, raw };
  } catch {
    // Unparseable. Contribute nothing, understand nothing, keep everything.
    return { rows: [], fullyUnderstood: false, raw };
  }
}

/**
 * Reads the current `recents_v1` collection.
 *
 * Unlike `readLegacyKey`, this routes BOTH failure shapes through the collection store's
 * corrupt-data rescue (`collection.ts`'s `readRaw`, which copies the raw value to a
 * `recents_v1__corrupt_<ts>` side-key before repairing the key). Two shapes reach here:
 *
 * - **Unparseable JSON** — `createCollectionStore().read()` rescues it internally.
 * - **Valid JSON that is not an array** (`{}`, `"x"`, `42`) — the store's `readRaw`
 *   `JSON.parse`s it successfully and hands back a non-array, so its rescue never fires.
 *   This function detects that case and performs the SAME rescue explicitly (`rescueKey`
 *   below) rather than silently treating it as `[]` and overwriting it on the next write.
 *
 * That second shape was a real data-loss path: `readLegacyKey`'s `if (!Array.isArray)
 * return []` treated a non-array `recents_v1` as empty, and the migration then wrote its
 * derivation straight over it — destroying whatever the key held with no rescue copy,
 * bypassing the very corrupt-data protection `collection.ts` exists to provide.
 */
async function readRecents(): Promise<Conversation[]> {
  const raw = await LocalStorage.getItem<string>(RECENTS_KEY);
  if (raw === undefined) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Unparseable: hand it to the store, whose `readRaw` performs the side-key rescue and
    // repairs the key. Reusing the store here (rather than reimplementing the rescue)
    // keeps one rescue implementation in the codebase.
    return recentsRescueStore.read();
  }

  if (Array.isArray(parsed)) {
    return (parsed as unknown[]).filter(isWellFormedRow) as Conversation[];
  }

  // Valid JSON, wrong shape. Rescue it the same way `collection.ts` rescues unparseable
  // data — copy the raw value aside, then repair the key — so the next write cannot
  // destroy it.
  await rescueNonArrayRecents(raw);
  return [];
}

/**
 * A `recents_v1` store used ONLY for its corrupt-data rescue on unparseable JSON. It
 * carries no `transformOnRead`/`persistFilter`: the migration must see raw rows (same
 * reason `readLegacyKey` bypasses those), and this instance never writes through
 * `persist`.
 */
const recentsRescueStore = createCollectionStore<Conversation>(RECENTS_KEY);

/**
 * Copies `raw` to a free `<key>__corrupt_<ISO>[_<n>]` side-key and returns the side-key it
 * used. Does NOT touch `key` itself — callers decide whether the original is repaired
 * (`recents_v1`, which stays live) or deleted (a legacy key, which retirement removes).
 *
 * The side-key naming matches `collection.ts`'s `pickCorruptSideKey` exactly — including
 * the `_<n>` collision suffix — because `recentsDelete.ts`'s `clearAllRecents` sweeps
 * side-keys by the `${key}__corrupt_` prefix, and a rescue that used a different shape
 * would leave chat text on disk after a "delete everywhere" (the delete rule's privacy point).
 * That sweep covers all four keys (`recents_v1` plus the three legacy ones), so a legacy
 * key's rescue is swept by Delete All exactly like a `recents_v1` rescue is.
 *
 * Same check-then-write collision caveat `collection.ts` documents: sequential rescues
 * cannot collide (each probe observes the prior write); two rescues racing inside one
 * microtask turn could. That residual gap is the platform's no-CAS limitation, not a
 * choice made here.
 */
async function rescueRawValue(key: string, raw: string): Promise<string> {
  const base = `${key}__corrupt_${new Date().toISOString()}`;
  let candidate = base;
  let suffix = 1;
  while ((await LocalStorage.getItem<string>(candidate)) !== undefined) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  await LocalStorage.setItem(candidate, raw);
  return candidate;
}

/**
 * Copies a valid-JSON-but-non-array `recents_v1` value aside, then repairs `recents_v1`
 * to an empty list.
 */
async function rescueNonArrayRecents(raw: string): Promise<void> {
  // Ordering is load-bearing, same as `collection.ts`: the rescue copy must land BEFORE
  // the key itself is repaired, or a failure between the two would lose the raw value.
  await rescueRawValue(RECENTS_KEY, raw);
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify([]));
}

/**
 * THE PANIC CASE — preserve what could not be parsed, BEFORE anything deletes it.
 *
 * THE USER'S RULING: "the panic case — export what we can't parse." A legacy key whose
 * content the migration could not fully understand must never be destroyed by retirement.
 * `readLegacyKey` reports that condition (`fullyUnderstood: false`) for all three shapes
 * that lose bytes: unparseable JSON, valid-JSON-but-not-an-array, and an array with any
 * row dropped as malformed.
 *
 * WHAT COUNTS AS "PARTIAL". A partially-readable key still retires: its well-formed rows
 * are migrated into `recents_v1` normally AND its raw value is preserved here, so neither
 * half is lost. Blocking retirement instead would strand the user in a state where the
 * migration re-runs forever against a key it can never fully read.
 *
 * RETURNS the side-keys written, so the caller can (a) confirm the rescue landed before
 * permitting the delete and (b) tell the user how many keys were preserved.
 *
 * ORDERING IS STRUCTURAL, mirroring how retirement already gates on verification: this
 * function's resolved result is a required argument to the retirement call, so there is no
 * path that deletes a legacy key without the rescue writes having already resolved. Each
 * write is confirmed by re-reading the side-key and comparing it to the raw string — a
 * `setItem` that resolves is not proof the value is durably there, the same standard
 * `runRecentsMigration` applies to its own `recents_v1` write. A rescue that does not
 * verify THROWS, which aborts the migration before `retireLegacyKeys` is ever reached and
 * leaves every legacy key untouched.
 */
async function rescueUnreadableLegacyKeys(
  reads: ReadonlyArray<{ key: string; fullyUnderstood: boolean; raw: string | undefined }>,
): Promise<string[]> {
  const rescued: string[] = [];

  for (const read of reads) {
    if (read.fullyUnderstood || read.raw === undefined) continue;

    const sideKey = await rescueRawValue(read.key, read.raw);

    // Verify by re-read before this value is allowed to count as preserved. If it did not
    // land, throwing here is the safe direction: the legacy key still holds the only copy,
    // and it is still on disk because retirement has not run.
    const verify = await LocalStorage.getItem<string>(sideKey);
    if (verify !== read.raw) {
      throw new Error(
        `Could not preserve unreadable legacy key "${read.key}": the rescue copy did not verify on re-read. ` +
          `No legacy data was deleted.`,
      );
    }
    rescued.push(sideKey);
  }

  return rescued;
}

/**
 * Pure merge: derives the full `recents_v1` collection from the three legacy
 * collections, as they currently stand. Contains NO I/O — that split is what makes the
 * three-way join and the dedupe rules directly unit-testable without a storage mock,
 * and is also what makes the migration idempotent: calling this twice on the same
 * inputs, or once on inputs that already reflect a previous run's output stitched back
 * together with a late write, produces the same result either way (see
 * `runRecentsMigration` below for exactly how re-runs stay a no-op).
 *
 * The three-way join:
 * 1. An answer already present in some conversation's `chats` does NOT get a new row
 *    (matched on `Chat.id`).
 * 2. When such an answer was saved, its `saved_at` transfers to the containing
 *    conversation's `pinned_at` instead of spawning a second row. If more than one
 *    saved answer inside the same conversation has a `saved_at`, the LATEST `saved_at`
 *    wins — pin time reflects the most recent moment the user's save action inside that
 *    thread would have promoted it, and taking a fixed aggregate (rather than e.g.
 *    "whichever happens to be last in array order") keeps the result deterministic
 *    across re-runs regardless of storage array order.
 * 3. A genuinely orphaned history/saved answer (absent from every conversation's
 *    `chats`) becomes a one-turn conversation, model defaulted to `DEFAULT_MODEL`
 *    (`Chat` carries no model, and `Conversation.model` is required).
 * 4. A synthesized one-turn conversation's `created_at`/`updated_at` come from the
 *    chat's own `created_at`.
 *
 * Conversations with `chats: []` (legacy data predating the `persistFilter`
 * rule that now keeps these out of storage) pass through unchanged: they are neither
 * a data-loss risk nor a join target (there is nothing in `chats` to match against),
 * so they are carried into `recents_v1` as zero-turn conversations rather than dropped.
 */
export function mergeIntoRecents(legacy: {
  conversations: Conversation[];
  history: Chat[];
  savedChats: SavedChat[];
}): Conversation[] {
  const { conversations, history, savedChats } = legacy;

  // Every chat id that already lives inside some conversation's `chats` — the
  // dedupe key for rule 1. Built once up front so history/savedChats lookups below are
  // O(1) instead of re-scanning every conversation per candidate answer.
  const chatIdToConversationId = new Map<string, string>();
  for (const conversation of conversations) {
    for (const chat of conversation.chats ?? []) {
      // First conversation to claim a chat id wins. In practice a given answer is
      // written into exactly one conversation's `chats`, so collisions are not expected
      // in real data; this is a deterministic tie-break rather than a silent drop if
      // one ever occurs.
      if (!chatIdToConversationId.has(chat.id)) {
        chatIdToConversationId.set(chat.id, conversation.id);
      }
    }
  }

  // Rule 2: collect the latest saved_at per conversation id, for chats that are
  // threaded (i.e. present in some conversation). Orphaned saved chats (not in the map)
  // are handled separately below, as synthesized one-turn conversations.
  const latestPinnedAtByConversationId = new Map<string, string>();
  for (const saved of savedChats) {
    if (!saved.saved_at) continue;
    const conversationId = chatIdToConversationId.get(saved.id);
    if (!conversationId) continue;

    const current = latestPinnedAtByConversationId.get(conversationId);
    if (!current || new Date(saved.saved_at).getTime() > new Date(current).getTime()) {
      latestPinnedAtByConversationId.set(conversationId, saved.saved_at);
    }
  }

  // Rule 1 + 2 applied to the threaded conversations themselves: carry every legacy
  // conversation through as-is (including `chats: []` rows), applying the
  // pinned_at transfer where a saved answer inside it calls for one. `pinned_at` is
  // additive-only relative to whatever pinned_at a conversation might already carry
  // (defensive: current storage never sets it, but a prior migration run — or a future
  // in-place edit of recents_v1 — might), so a later legacy write's later saved_at
  // updates it, but never regresses it to an earlier or undefined value once set.
  const migratedConversations: Conversation[] = conversations.map((conversation) => {
    const derivedPinnedAt = latestPinnedAtByConversationId.get(conversation.id);
    if (!derivedPinnedAt) return conversation;

    const existingPinnedAt = conversation.pinned_at;
    const winningPinnedAt =
      existingPinnedAt && new Date(existingPinnedAt).getTime() > new Date(derivedPinnedAt).getTime()
        ? existingPinnedAt
        : derivedPinnedAt;

    return { ...conversation, pinned_at: winningPinnedAt, pinned: true };
  });

  // Rule 3 + 4: orphaned answers — present in history or savedChats but in NO
  // conversation's chats — become one-turn conversations. An answer can be orphaned in
  // both history and savedChats at once (the common case: every saved answer normally
  // also lives in history); dedupe by chat id across the two sources using history's
  // row when present (savedChats rows are a strict superset of Chat plus `saved_at`,
  // so either source carries the same question/answer/created_at — only `saved_at`
  // differs, which is applied afterward regardless of which source supplied the base row).
  // `orphanChatsById` is keyed by `chat.id`, so two DISTINCT orphan chats sharing the
  // same `id` would collapse to one row here, same as the cross-conversation collision
  // tie-break above: first (here, `history`-array-order) wins, the second is dropped.
  // This requires an id collision `uuidv4()` never produces in practice — every `chat`
  // this extension writes gets a fresh `uuidv4()` (`src/hooks/useChat.tsx`) — so this is
  // a deliberate, documented tie-break for a shape real data can't produce, not an
  // unhandled case. `isWellFormedRow` (in `readLegacyKey`) only screens malformed rows
  // out; it does not create id collisions, since it drops rows rather than renaming
  // duplicate ids down to one.
  const orphanChatsById = new Map<string, Chat>();
  for (const chat of history) {
    if (chatIdToConversationId.has(chat.id)) continue;
    orphanChatsById.set(chat.id, chat);
  }
  const orphanSavedAtById = new Map<string, string>();
  for (const saved of savedChats) {
    if (chatIdToConversationId.has(saved.id)) continue;
    if (!orphanChatsById.has(saved.id)) {
      // Saved but its history row was deleted (or never existed) — the saved copy is
      // the only surviving record of the answer. Still orphaned; still must survive.
      // `saved_at` is intentionally excluded from the base chat row here: it is applied
      // separately below via `orphanSavedAtById`, uniformly regardless of which source
      // (history or savedChats) supplied the base row.
      const chat: Chat = { id: saved.id, question: saved.question, answer: saved.answer, created_at: saved.created_at };
      orphanChatsById.set(saved.id, chat);
    }
    if (saved.saved_at) {
      const current = orphanSavedAtById.get(saved.id);
      if (!current || new Date(saved.saved_at).getTime() > new Date(current).getTime()) {
        orphanSavedAtById.set(saved.id, saved.saved_at);
      }
    }
  }

  const synthesizedConversations: Conversation[] = [...orphanChatsById.values()].map((chat) => {
    const pinnedAt = orphanSavedAtById.get(chat.id);
    return {
      id: chat.id,
      model: DEFAULT_MODEL,
      chats: [chat],
      created_at: chat.created_at,
      updated_at: chat.created_at,
      pinned: !!pinnedAt,
      pinned_at: pinnedAt,
      archived: false,
    };
  });

  return [...migratedConversations, ...synthesizedConversations];
}

/**
 * THE OWNERSHIP INVARIANT — the contract `reconcileRecents` below enforces. Stated in
 * full on `Conversation` in `src/type.ts`; restated here because this is the function
 * that can violate it.
 *
 * These fields live ONLY on the `recents_v1` copy of a conversation. Nothing in the
 * legacy `conversations`/`history`/`savedChats` keys stores them, so a re-derivation can
 * never produce a truer value for them than the one `recents_v1` already holds — it can
 * only produce a DEFAULT that erases the user's decision. Every other field
 * (`chats`, `updated_at`, `created_at`, `model`) is legacy-derived and correctly takes
 * the newer row's value whole-row.
 *
 * STILL LOAD-BEARING AFTER RETIREMENT. Once the legacy keys are retired
 * (`recentsRetirement.ts`) there is nothing left to re-derive FROM, so this reconcile
 * becomes a no-op for most users. It must not be deleted: it still runs on the
 * pre-retirement pass that folds a legacy user's data in — the exact pass where losing
 * `archived`/`title` would be a permanent, unrecoverable erasure of their decisions,
 * since the legacy keys are deleted moments later.
 *
 * The Critical this fixes: `updated_at` is not bumped by any Recents mutation (Archive
 * spreads the row unchanged — `src/recents.tsx`), so the derived row TIES on
 * `updated_at` and, under a whole-row tie-break, wins — discarding `archived` and
 * `title` on every single mount. Preserving these fields explicitly (rather than relying
 * on an `updated_at` bump) is what makes the fix independent of whether any given call
 * site remembers to touch the timestamp.
 *
 * `pinned_at` is handled separately below rather than listed here: it is Recents-owned
 * but ALSO derivable from `savedChats.saved_at`, so it needs the timestamp comparison
 * against `unpinned_at`, not a blind carry-forward.
 *
 * ADDING A FIELD: if a Recents action sets it and no legacy key writes it, add it here.
 */
const RECENTS_OWNED_FIELDS = ["archived", "title"] as const;

/**
 * Copies the Recents-owned fields from `current` onto `next`, preserving the ABSENCE of a
 * value as faithfully as its presence: `archived: false` (an explicit unarchive) and
 * `title: undefined` (a cleared rename) are user decisions exactly as much as
 * `archived: true` is, so the key is carried across whenever it is present on the current
 * row — never conditionally on truthiness, which would make "unarchive" unexpressible in
 * the same way "unpin" was.
 */
export function carryRecentsOwnedFields(next: Conversation, current: Conversation): Conversation {
  const result = { ...next };
  for (const field of RECENTS_OWNED_FIELDS) {
    if (field in current) {
      // Each field's type is preserved by the per-key assignment; the union of literal
      // keys keeps this exhaustive over RECENTS_OWNED_FIELDS with no cast.
      if (field === "archived") result.archived = current.archived;
      if (field === "title") result.title = current.title;
    }
  }
  return result;
}

/**
 * Resolves `pinned_at`/`unpinned_at` between the row `recents_v1` holds and the row just
 * re-derived from the legacy keys.
 *
 * `pinned_at` is additive-only among PINS — a later `saved_at` in `savedChats` moves the
 * pin forward, never backward. But an additive-only rule alone made unpinning impossible
 * BEFORE retirement: `savedChats` kept its `saved_at` indefinitely, so every mount
 * re-derived a `pinned_at` and a user's unpin was undone before they saw it. That
 * contradiction is resolved by making unpin a TIMESTAMPED decision instead of an absence:
 * the latest of {pin, unpin} wins.
 *
 * Retirement removes the recurring re-derivation, but this logic stays: it is still what
 * resolves pin state on the one pre-retirement pass, and `unpinned_at` rows already
 * written to `recents_v1` must keep resolving correctly forever after.
 *
 * - unpin newer than every known pin  -> unpinned (and `unpinned_at` is carried forward
 *   so the decision keeps winning on every subsequent mount, not just the next one).
 * - a pin newer than the unpin        -> pinned. This covers both re-pinning from the UI
 *   and the honest case where the user saved the answer again after unpinning.
 */
export function resolvePinState(
  current: Conversation,
  derived: Conversation,
): Pick<Conversation, "pinned_at" | "unpinned_at" | "pinned"> {
  const time = (value: string | undefined): number => (value ? new Date(value).getTime() : Number.NEGATIVE_INFINITY);

  // Additive-only among pins: the latest pin either side knows about.
  const latestPinnedAt = time(current.pinned_at) >= time(derived.pinned_at) ? current.pinned_at : derived.pinned_at;
  // `unpinned_at` is Recents-owned outright — no legacy key can produce one — so the
  // current row's value is authoritative, with the derived row's read defensively in case
  // a future in-place edit of recents_v1 supplies one.
  const unpinnedAt = time(current.unpinned_at) >= time(derived.unpinned_at) ? current.unpinned_at : derived.unpinned_at;

  const isUnpinned = time(unpinnedAt) >= time(latestPinnedAt) && unpinnedAt !== undefined;

  return {
    pinned_at: isUnpinned ? undefined : latestPinnedAt,
    unpinned_at: unpinnedAt,
    pinned: isUnpinned ? false : !!latestPinnedAt,
  };
}

/**
 * Deterministically merges two ALREADY-migrated `recents_v1` states by conversation id.
 * Legacy-derived fields take the newer `updated_at` row whole-row; RECENTS-OWNED fields
 * are preserved from the `recents_v1` row regardless of which side is newer (see
 * `RECENTS_OWNED_FIELDS` above); pin state is resolved by `resolvePinState`. Used by
 * `runRecentsMigration` to combine a run's freshly re-derived result with whatever
 * `recents_v1` already holds, so idempotency holds even across a run whose
 * `mergeIntoRecents` output differs slightly from a prior run's (e.g. a late legacy write
 * added a new orphan chat, or added a chat to a conversation that previously had none).
 */
export function reconcileRecents(current: Conversation[], derived: Conversation[]): Conversation[] {
  const byId = new Map<string, Conversation>();
  for (const conversation of current) {
    byId.set(conversation.id, conversation);
  }

  for (const incoming of derived) {
    const existing = byId.get(incoming.id);
    if (!existing) {
      byId.set(incoming.id, incoming);
      continue;
    }

    const incomingIsNewer = new Date(incoming.updated_at).getTime() >= new Date(existing.updated_at).getTime();
    const base = incomingIsNewer ? incoming : existing;

    // Whole-row winner for the legacy-derived fields, then the Recents-owned fields are
    // restored from `existing` (the `recents_v1` row) unconditionally — that ordering is
    // the entire fix. `base` may BE `existing`, in which case this is a no-op.
    const merged = carryRecentsOwnedFields(base, existing);

    byId.set(incoming.id, {
      ...merged,
      ...resolvePinState(existing, incoming),
    });
  }

  return [...byId.values()];
}

/** What a completed migration pass reports back to its caller. */
export type RecentsMigrationResult = {
  /** The reconciled `recents_v1` contents this pass committed. */
  conversations: Conversation[];
  /**
   * Side-keys written by the panic-case rescue on this pass, one per legacy key whose
   * bytes could not be fully understood. Empty on the overwhelmingly common path.
   */
  rescuedSideKeys: string[];
};

/**
 * Runs the full commit protocol, then retires the legacy keys.
 *
 * 1. Read the generation counter, the three legacy keys, AND the current `recents_v1`.
 * 2. Derive the merge from legacy state (`mergeIntoRecents`).
 * 3. Reconcile that derivation onto whatever `recents_v1` already holds
 *    (`reconcileRecents`) — what makes a second run, or a run after a late legacy write,
 *    converge instead of re-appending.
 * 4. Commit to `recents_v1` ONLY IF the generation counter has not moved since step 1
 *    (`commitRecentsIfUnchanged`). If it moved, another writer (a delete, or a Recents
 *    action) committed while this run was deriving — the payload in hand would resurrect
 *    what they removed or erase what they wrote, so it is discarded and the whole
 *    derivation is retried against fresh state.
 * 5. Verify by re-reading `recents_v1` and comparing to what was written — a migration
 *    must be able to tell whether its own write actually landed. Throws if not, so a
 *    caller never treats an unwritten migration as complete.
 * 6. Preserve any legacy key whose bytes could not be fully understood
 *    (`rescueUnreadableLegacyKeys`), verifying each rescue copy by re-read.
 * 7. ONLY AFTER both verifications succeed, retire the legacy keys
 *    (`retireLegacyKeys`) — see `recentsRetirement.ts` for the ordering and crash-safety
 *    rationale. A throw anywhere in steps 4-6 leaves the legacy keys untouched, which is
 *    the user's rollback.
 *
 * THE ORDERING GUARANTEE, stated once: nothing in this function deletes a legacy key
 * before BOTH `verifyRaw === payload` has held AND every unreadable key's raw value has
 * been copied aside and verified. That is structural — `retireLegacyKeys` requires the
 * verified payload string AND the rescued side-key list as arguments, and neither value
 * exists before its own verification has passed.
 *
 * RETURNS the migrated conversations plus the side-keys any panic-case rescue wrote, so
 * the caller can tell the user their unreadable data was preserved rather than destroyed
 * (`useRecents`'s toast). A silent rescue beats a silent deletion, but the user cannot act
 * on what they cannot see.
 */
export async function runRecentsMigration(): Promise<RecentsMigrationResult> {
  for (let attempt = 0; attempt < MAX_COMMIT_ATTEMPTS; attempt += 1) {
    // The generation must be read BEFORE the data it describes, so a writer committing
    // between these two reads bumps a counter we have already sampled — making the
    // conflict detectable. Reading it after would let that writer's bump be absorbed into
    // our "expected" value and go unnoticed.
    const generation = await readGeneration();

    const [conversations, history, savedChats, existingRecents] = await Promise.all([
      readLegacyKey<Conversation>(CONVERSATIONS_KEY),
      readLegacyKey<Chat>(HISTORY_KEY),
      readLegacyKey<SavedChat>(SAVED_CHATS_KEY),
      readRecents(),
    ]);

    // Every legacy key the migration is about to migrate-and-retire, paired with whether
    // it was fully understood. Used for the panic-case rescue below.
    const legacyReads = [
      { key: CONVERSATIONS_KEY, ...conversations },
      { key: HISTORY_KEY, ...history },
      { key: SAVED_CHATS_KEY, ...savedChats },
    ];

    const derived = mergeIntoRecents({
      conversations: conversations.rows,
      history: history.rows,
      savedChats: savedChats.rows,
    });
    const reconciled = reconcileRecents(existingRecents, derived);
    const payload = JSON.stringify(reconciled);

    const committed = await commitRecentsIfUnchanged(payload, generation);
    if (!committed) {
      // Another writer won. Our payload predates their change and must not be written.
      // Recompute from fresh state — the migration is idempotent, so this converges.
      continue;
    }

    // Verify by re-read, per the commit protocol: not trusting that `setItem` resolving
    // without throwing means the value is durably there.
    const verifiedPayload = await verifyPayloadRoundTrip(payload);

    // THE PANIC CASE, before any delete. Any legacy key whose bytes the migration could
    // not fully understand is copied to a `<key>__corrupt_<ISO>` side-key and that copy is
    // verified by re-read. This THROWS if a rescue does not verify, which exits before
    // `retireLegacyKeys` and leaves every legacy key on disk.
    const rescuedSideKeys = await rescueUnreadableLegacyKeys(legacyReads);

    // VERIFIED. Only now may the legacy keys be retired — `verifyRaw` is the proof that
    // `recents_v1` holds the migrated rows, and `rescuedSideKeys` is the proof that
    // everything NOT migrated has been preserved. Both are required arguments, which is
    // what makes the ordering structural rather than a comment: neither value exists
    // before its own verification has passed.
    await retireLegacyKeys(verifiedPayload, reconciled.length, rescuedSideKeys);

    return { conversations: reconciled, rescuedSideKeys };
  }

  throw new Error(
    "Recents migration could not commit: `recents_v1` kept changing underneath it. No legacy data was deleted.",
  );
}
