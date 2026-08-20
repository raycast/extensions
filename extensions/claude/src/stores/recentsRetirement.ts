import { LocalStorage } from "@raycast/api";
// From the LEAF key module, never from `recentsMigration` — importing the key names from
// there would recreate the circular import this module's `retireLegacyKeys` consumer
// already forms. See `recentsKeys.ts` for what that cycle broke.
import { LEGACY_KEYS } from "./recentsKeys";

/**
 * LEGACY KEY RETIREMENT — the user's ruling (fix-wave 6, superseding Task 5's "never
 * touch the legacy keys" constraint).
 *
 * The three legacy keys (`conversations`, `history`, `savedChats`) were a SECOND LIVE
 * SOURCE OF TRUTH forever: `runRecentsMigration()` re-derived from them on every Recents
 * mount, and Ask kept writing to them. That is the shared root cause of both Criticals —
 * a conversation deleted from `recents_v1` was re-derived back into existence from legacy
 * rows Ask had rewritten. Defending the second source (tombstones, delete-everywhere
 * sweeps) was tried and kept leaking. This module REMOVES the second source instead.
 *
 * After retirement, `recents_v1` is the single source of truth: Ask writes there
 * directly (`src/hooks/useAskConversation.ts`), and the migration has nothing left to
 * re-derive from.
 *
 * THE ORDERING IS NON-NEGOTIABLE: **verify, then delete. Never the reverse.**
 * `runRecentsMigration()` writes `recents_v1` and verifies it by re-read, throwing if the
 * write didn't land. Only after that verification succeeds may the legacy keys be
 * removed. If verification fails or throws, the legacy keys survive untouched — they are
 * the user's rollback. That ordering is enforced STRUCTURALLY, not by comment: see
 * `LegacyRetiredToken` below and `runRecentsMigration`'s token parameter.
 */

/**
 * Opaque proof that the retirement sequence has been *evaluated* to completion for the
 * current migration pass — i.e. either the legacy keys are now gone, or they were
 * deliberately left in place because verification had not succeeded.
 *
 * Same branded-`unique symbol` construction as `MigrationVerifiedToken` in
 * `recentsDelete.ts`, and for the same reason: the brand field is NOT exported, so
 * TypeScript's structural typing cannot let a caller hand-roll one. The only way to
 * obtain a value assignable to this type is to call `retireLegacyKeys` below, which
 * cannot run before its `verifiedPayload` argument exists — and that argument only
 * exists after the migration's own verify-by-re-read has passed.
 */
declare const legacyRetiredBrand: unique symbol;
export type LegacyRetiredToken = { readonly [legacyRetiredBrand]: true };

/**
 * A `recents_v1` payload string that has been READ BACK out of storage and compared equal
 * to what was written. Minting it is the only way to obtain the first argument of
 * `retireLegacyKeys`, so "verify, then delete" is a property the compiler checks rather
 * than a convention of one call site.
 *
 * The brand field is a non-exported `unique symbol`, so structural typing cannot let a
 * caller hand-roll one — `retireLegacyKeys("anything", 0, [])` used to typecheck, which
 * is precisely the hole this closes. Same construction as `MigrationVerifiedToken` in
 * `recentsDelete.ts`.
 */
declare const verifiedPayloadBrand: unique symbol;
export type VerifiedPayload = string & { readonly [verifiedPayloadBrand]: true };

/**
 * The only mint for a `VerifiedPayload`, and it earns the name: it takes what was written
 * AND what was read back, and throws unless they are identical. A caller cannot produce
 * the token by asserting it verified — it has to hand over both strings and be right.
 */
export function verifyPayloadRoundTrip(written: string, readBack: string | undefined): VerifiedPayload {
  if (readBack !== written) {
    throw new Error("Recents migration write did not verify on re-read; storage may not have persisted it.");
  }
  return written as VerifiedPayload;
}

/**
 * The marker key recording that legacy retirement completed.
 *
 * WHY THIS MARKER CANNOT LIE. A bare boolean (`"legacy_retired": "true"`) can lie in
 * both directions, and each direction loses data:
 *
 * - **It can claim retirement that never happened.** A boolean written before the
 *   deletes resolve, or by an older build, would make every later run skip the migration
 *   while legacy rows still hold the only copy of some conversations — permanently
 *   stranded, because nothing re-derives them again.
 * - **It can claim retirement of a DIFFERENT dataset.** A boolean carries no link to the
 *   payload that was verified. If `recents_v1` is later wiped, restored from a backup, or
 *   corrupted-and-rescued to `[]`, a bare `true` still says "retired" — so the migration
 *   stays skipped and the legacy data, if any survived, is never folded back in.
 *
 * This marker instead records the FINGERPRINT of the exact `recents_v1` payload whose
 * write was verified: row count plus a content hash of the verified JSON. Retirement is
 * treated as complete only when the marker's fingerprint still matches what `recents_v1`
 * holds right now (`isRetirementComplete`). If `recents_v1` changes out from under it in
 * a way the fingerprint can't explain, the marker is simply *not believed*, and the
 * migration runs again — which is safe, because the migration is idempotent and additive.
 *
 * The marker is therefore never load-bearing for DATA SAFETY, only for skipping work:
 * the worst case of disbelieving it is a redundant idempotent migration pass, and the
 * worst case of believing a stale one is prevented by the fingerprint check itself.
 */
export const LEGACY_RETIRED_KEY = "recents_legacy_retired_v1";

/** Re-exported for callers that think of the legacy key set as a retirement concept. */
export { LEGACY_KEYS };

/** Shape stored under `LEGACY_RETIRED_KEY`. */
export interface RetirementMarker {
  /** Schema version of this marker, so a future change can invalidate old markers. */
  version: 1;
  /** Number of rows in the verified `recents_v1` payload. */
  rowCount: number;
  /** Content hash of the verified `recents_v1` payload — see `fingerprintPayload`. */
  hash: string;
  /** When retirement completed. Diagnostic only; never compared. */
  retired_at: string;
}

/**
 * A stable, dependency-free content hash of the verified payload (FNV-1a, 32-bit, hex).
 *
 * This is a CHANGE DETECTOR, not a security primitive — its only job is to notice that
 * `recents_v1` is no longer the payload retirement was justified by. Collisions are
 * irrelevant to safety here: a collision would merely cause a redundant migration to be
 * skipped, and the migration is idempotent, so the pre-retirement state it would have
 * re-derived is by definition already reflected in `recents_v1` (the legacy keys it read
 * from are gone). Hashing the payload also keeps the marker O(1) in size regardless of
 * transcript volume, which a full copy would not.
 */
export function fingerprintPayload(payload: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    // FNV prime, applied with Math.imul so the multiply stays 32-bit and doesn't lose
    // precision through the float64 path a plain `*` would take.
    hash = Math.imul(hash, 0x01000193);
  }
  // `>>> 0` normalizes to unsigned before hex, so the string never carries a sign.
  return (hash >>> 0).toString(16);
}

/** Builds the marker for a payload whose write to `recents_v1` has been verified. */
export function buildRetirementMarker(verifiedPayload: string, rowCount: number, now: () => string): RetirementMarker {
  return {
    version: 1,
    rowCount,
    hash: fingerprintPayload(verifiedPayload),
    retired_at: now(),
  };
}

/** Parses a stored marker, tolerating absence and corruption (both mean "not retired"). */
export function parseRetirementMarker(raw: string | undefined): RetirementMarker | null {
  if (raw === undefined) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const marker = parsed as Partial<RetirementMarker>;
    if (marker.version !== 1) return null;
    if (typeof marker.rowCount !== "number" || typeof marker.hash !== "string") return null;
    if (typeof marker.retired_at !== "string") return null;
    return { version: 1, rowCount: marker.rowCount, hash: marker.hash, retired_at: marker.retired_at };
  } catch {
    // A corrupt marker is not believed — the migration runs again, which is safe and
    // idempotent. Never throw here: a bad marker must not be able to block the app.
    return null;
  }
}

/**
 * Whether the marker still describes the CURRENT `recents_v1` payload. This is the check
 * that stops the marker from lying: a marker minted against a payload that is no longer
 * there is treated as absent, so the migration re-runs rather than trusting a claim it
 * can no longer justify.
 */
export function isMarkerCurrent(marker: RetirementMarker | null, currentPayload: string, currentRowCount: number) {
  if (!marker) return false;
  return marker.rowCount === currentRowCount && marker.hash === fingerprintPayload(currentPayload);
}

/**
 * Reads the retirement marker and decides whether retirement is complete for the payload
 * `recents_v1` currently holds.
 */
export async function isRetirementComplete(currentPayload: string, currentRowCount: number): Promise<boolean> {
  const marker = parseRetirementMarker(await LocalStorage.getItem<string>(LEGACY_RETIRED_KEY));
  return isMarkerCurrent(marker, currentPayload, currentRowCount);
}

/**
 * THE RETIREMENT SEQUENCE. Callable ONLY from `runRecentsMigration`, and only after its
 * verify-by-re-read has passed — the `verifiedPayload` parameter is what encodes that
 * precondition: it is the exact string the migration read BACK out of `recents_v1` and
 * compared equal to what it wrote. There is no way to call this function without having
 * such a string in hand.
 *
 * CRASH-SAFETY AND IDEMPOTENCY — the ordering, and why each step is where it is:
 *
 *   1. Write the marker FIRST, then delete the legacy keys.
 *   2. Deletes are individually idempotent (`removeItem` of an absent key is a no-op).
 *
 * Writing the marker before the deletes is deliberate and is the crash-safe ordering.
 * Consider the two possible crash points:
 *
 * - **Crash between marker and deletes** (marker written, legacy keys still present):
 *   the data exists in BOTH places. `recents_v1` is complete (its write was verified and
 *   the marker fingerprint matches it), so no data is lost. The next run sees a current
 *   marker, calls this function again, and the deletes simply complete. Retirement
 *   converges. The only cost of this window is stale duplicate rows on disk, which the
 *   next mount clears.
 * - **Crash between deletes** (some legacy keys gone, some present): identical
 *   situation — `recents_v1` already carries everything those keys contributed, because
 *   its verified write happened before any delete. Re-running finishes the rest.
 *
 * The reverse ordering (delete first, mark second) is what would create the "data in
 * neither place" state the brief warns about: a crash after deleting `conversations` but
 * before writing the marker leaves a later run believing retirement never happened, so it
 * re-derives from now-empty legacy keys — and if `recents_v1` were ever independently
 * reset in that window, the rows would be gone from both. Marker-first makes
 * `recents_v1`'s verified write strictly precede every destructive step, so at no instant
 * is a row's only copy the one being deleted.
 *
 * A user on an OLD build still running the previous code path is also safe: that build
 * only ever ADDS to the legacy keys and re-derives into `recents_v1`. Its writes land
 * after retirement, so the next new-build mount finds legacy keys present again, sees its
 * marker no longer matches (`recents_v1` changed, or the legacy write introduced rows),
 * re-runs the idempotent migration to fold them in, and retires them again. Retirement is
 * a repeatable convergence, not a one-shot switch.
 */
export async function retireLegacyKeys(
  verifiedPayload: VerifiedPayload,
  rowCount: number,
  rescuedSideKeys: readonly string[],
  now: () => string = () => new Date().toISOString(),
): Promise<LegacyRetiredToken> {
  // THE PANIC-CASE GATE. `rescuedSideKeys` is the migration's proof that every legacy key
  // whose bytes it could not fully understand has ALREADY been copied to a verified
  // `<key>__corrupt_<ISO>` side-key. Requiring it as a parameter is the same structural
  // device as `verifiedPayload`: the only place that list exists is after
  // `rescueUnreadableLegacyKeys` has resolved, and that function throws rather than
  // returning if a rescue copy fails to verify on re-read. So there is no call path that
  // reaches the deletes below with unpreserved bytes still only on the legacy key.
  //
  // Honest limit: unlike `verifiedPayload`, this argument is a plain `readonly string[]`
  // and `[]` typechecks. What holds the invariant here is that exactly one call site
  // exists and it passes `rescueUnreadableLegacyKeys`'s return value — a convention, not
  // a compiler guarantee. Branding it would need the mint to live where the re-read
  // verification happens, which is in `recentsMigration.ts`, and importing this module
  // from there is already the cycle `recentsKeys.ts` exists to avoid. Recorded rather
  // than overstated; `verifiedPayload` is the one that is actually enforced.
  void rescuedSideKeys;

  const marker = buildRetirementMarker(verifiedPayload, rowCount, now);

  // Step 1 — marker first. See the ordering rationale above.
  await LocalStorage.setItem(LEGACY_RETIRED_KEY, JSON.stringify(marker));

  // Step 2 — the destructive step, now that `recents_v1` provably holds everything.
  // `removeItem` on an absent key is a no-op, which is what makes a partial previous
  // run safe to finish here.
  await Promise.all(LEGACY_KEYS.map((key) => LocalStorage.removeItem(key)));

  return {} as LegacyRetiredToken;
}

/** True when any legacy key still holds a value — used by tests and by the migration's
 *  fast path to decide whether there is anything left to fold in. */
export async function anyLegacyKeyPresent(): Promise<boolean> {
  const values = await Promise.all(LEGACY_KEYS.map((key) => LocalStorage.getItem<string>(key)));
  return values.some((value) => value !== undefined);
}
