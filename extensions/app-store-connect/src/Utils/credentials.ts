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
