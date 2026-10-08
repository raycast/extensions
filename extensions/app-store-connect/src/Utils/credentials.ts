/**
 * Identity rules for stored App Store Connect credentials.
 *
 * Stored credentials carry no id, so the whole record is the identity. Key ID alone is
 * NOT unique: the same key can legitimately be stored twice — re-added after a typo in
 * the Issuer ID, or registered under two issuers — and treating Key ID as the identity
 * makes removing one delete the other.
 *
 * Kept free of Raycast imports so the rules can be exercised outside Raycast.
 */

/** Structural shape of a stored credential; `Team` in the model satisfies it. */
export interface StoredCredential {
  name: string;
  issuerID?: string;
  apiKey: string;
  privateKey: string;
}

/**
 * Identifies the App Store Connect account a request's data belongs to, for partitioning
 * caches by credential.
 *
 * Key ID plus Issuer ID is what decides WHICH account answers a request; the private key
 * and the local label do not, and key material must never be written into a cache key
 * that gets persisted. An individual key has no Issuer ID, so the two shapes cannot
 * collide on a shared Key ID — `"ABC123:"` is not `"ABC123:69a6de00-…"`.
 *
 * Returns "" when there is no usable credential, which callers treat as "do not fetch".
 */
export function credentialCacheKey(apiKey: string | undefined, issuerID: string | undefined): string {
  if (!apiKey) {
    return "";
  }
  return `${apiKey}:${issuerID ?? ""}`;
}

/**
 * True when a stored name carries nothing a person actually typed.
 *
 * Earlier versions generated a name for an unnamed credential, and those names are in
 * storage — they outlive the code that wrote them. Now that the list groups by key type,
 * such a name renders as "Team Key" under a "Team Keys" heading, so it counts as no name.
 *
 * Two rules, both narrow on purpose:
 *
 * - Matched against the label THIS record would have been given, not a pattern. A Key ID
 *   is not guaranteed to be `[A-Z0-9]` and the old generator interpolated whatever it was
 *   handed, so a shape test both missed real generated names and would have claimed a
 *   parenthetical naming somebody else's key.
 * - Only the parenthesized form, which is the only form any released version wrote. That
 *   leaves "Team Key" free to be a name a person chose, which it otherwise could not be.
 *
 * **Known residue.** Someone who deliberately names a key the exact string this would
 * have generated for it — "Team Key (ABC123)" on the key whose ID is ABC123 — has that
 * name treated as absent, and sees the Key ID instead. Two identical strings in storage
 * cannot be told apart; closing it needs recorded provenance, which means normalizing
 * legacy names AND the flat selection keys that mirror them, i.e. the same storage-format
 * migration the hook's concurrency limitation is waiting on. Deliberately not done here:
 * the collision requires typing your own Key ID in this exact shape, the consequence is a
 * label rather than lost key material, and Rename Key undoes it.
 */
export function isUnnamed(credential: Pick<StoredCredential, "name" | "apiKey">) {
  const trimmed = credential.name.trim();
  if (trimmed.length === 0) {
    return true;
  }
  return trimmed === `Individual Key (${credential.apiKey})` || trimmed === `Team Key (${credential.apiKey})`;
}

/**
 * What to call a credential on screen.
 *
 * The name is purely a local label — never sent to Apple, with no equivalent in the API —
 * so it stays optional. An unnamed credential shows its Key ID, which is what actually
 * tells two of them apart; the key type comes from the section the row sits in.
 */
export function keyDisplayName(credential: Pick<StoredCredential, "name" | "apiKey">) {
  return isUnnamed(credential) ? credential.apiKey : credential.name.trim();
}

export function isSameCredential(a: StoredCredential, b: StoredCredential): boolean {
  return a.apiKey === b.apiKey && a.privateKey === b.privateKey && a.issuerID === b.issuerID && a.name === b.name;
}

/**
 * Removes exactly ONE entry matching `target`.
 *
 * Returns `removed: false` when nothing matched, so a caller can leave storage untouched
 * rather than writing back an unchanged list. Removing a single index — not every match —
 * is what keeps an identical duplicate from taking a working credential with it.
 */
export function removeOneCredential<T extends StoredCredential>(
  credentials: T[],
  target: StoredCredential,
): { removed: boolean; remaining: T[] } {
  const index = credentials.findIndex((candidate) => isSameCredential(candidate, target));
  if (index === -1) {
    return { removed: false, remaining: credentials };
  }
  return { removed: true, remaining: credentials.filter((_, i) => i !== index) };
}

/**
 * Finds the credential a user acted on, given where it sat in the rendered list.
 *
 * Content alone cannot identify a row: two byte-identical records match each other, so
 * searching by identity always finds the first — click the second row, watch the first
 * one change. Position alone cannot either, since it comes from a previous render and
 * storage may have shifted. So position is used only when the record still there matches
 * what was rendered, and otherwise this falls back to a search.
 *
 * Returns -1 when the credential is gone entirely.
 */
export function locateCredential<T extends StoredCredential>(
  credentials: T[],
  target: StoredCredential,
  position: number,
): number {
  const atPosition = credentials[position] !== undefined && isSameCredential(credentials[position], target);
  return atPosition ? position : credentials.findIndex((candidate) => isSameCredential(candidate, target));
}
