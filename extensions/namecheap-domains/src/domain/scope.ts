import { createHash } from "node:crypto";

/**
 * Identifies whose data a stored value belongs to.
 *
 * Both the domain snapshot and the pricing table are account-specific: a portfolio obviously so, and pricing
 * because Namecheap returns `YourPrice` for the calling account's tier. Keying stored data by environment
 * alone means pointing the extension at a second account in the same environment reads back the first
 * account's data. The account is hashed because the pricing cache is a plaintext file on disk.
 */
export function scopeKey(environment: string, account: string): string {
  const normalized = account.trim().toLowerCase();
  const digest = createHash("sha256").update(normalized).digest("hex").slice(0, 12);
  return `${environment}:${digest}`;
}
