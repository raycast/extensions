import { LocalStorage } from "@raycast/api";
import { fetchSigningKey } from "@mcdays/cloudflare-images-core";

/**
 * Resolves the HMAC signing key used for signed CF Images URLs.
 *
 * Resolution order (mirrors the VS Code extension's `getSigningKey`):
 *   1. `manualSigningKey` preference — explicit user-provided override. Skips
 *      both the LocalStorage cache and the API auto-fetch entirely. Useful
 *      when the API token can't read /images/v1/keys but the user has the
 *      key from elsewhere.
 *   2. LocalStorage cache, keyed by account ID. Cached across runs.
 *   3. Fresh fetch from the Cloudflare API → cached for next time.
 *
 * Throws when steps 1–3 all fail, so callers can surface a useful toast.
 *
 * The signing-key cache lives in Raycast LocalStorage scoped per account, so
 * switching CF accounts gets its own key — no leakage. To force a refetch
 * after a CF-side key rotation, call `clearCachedSigningKey(accountId)`.
 */
const KEY_PREFIX = "signing-key:";

export interface SigningKeyContext {
  accountId: string;
  apiToken: string;
  /** Optional manual override from the `manualSigningKey` preference. */
  manualOverride?: string;
}

export async function getSigningKey(ctx: SigningKeyContext): Promise<string> {
  const trimmedOverride = ctx.manualOverride?.trim();
  if (trimmedOverride) {
    return trimmedOverride;
  }

  const cacheKey = KEY_PREFIX + ctx.accountId;

  const cached = await LocalStorage.getItem<string>(cacheKey);
  if (cached) {
    return cached;
  }

  const fetched = await fetchSigningKey(ctx.accountId, ctx.apiToken);
  if (!fetched) {
    throw new Error(
      "Couldn't fetch a signing key from Cloudflare. Make sure your API token has the 'Cloudflare Images: Edit' permission, then try again. If you have the signing key from somewhere else (e.g. the CF dashboard), paste it into 'Manual Signing Key' in extension preferences. If you don't use signed URLs at all, turn off the 'Signed URLs' preference.",
    );
  }

  await LocalStorage.setItem(cacheKey, fetched);
  return fetched;
}

export async function clearCachedSigningKey(accountId: string): Promise<void> {
  await LocalStorage.removeItem(KEY_PREFIX + accountId);
}
