/** Wording for SnapTrade's rate limit responses. Pure (no Raycast imports). */

/**
 * A 429 message built from SnapTrade's headers. SnapTrade limits balances, positions and activities
 * per account (X-RateLimit-Account-Limit per minute, reset in X-RateLimit-Account-Reset seconds).
 */
export function rateLimitMessage(header: (name: string) => string | null): string {
  const limit = Number(header("x-ratelimit-account-limit"));
  const reset = Number(header("x-ratelimit-account-reset") ?? header("retry-after"));
  const what = Number.isFinite(limit) && limit > 0 ? ` (${limit} requests a minute)` : "";
  const when = Number.isFinite(reset) && reset > 0 ? `try again in ${Math.ceil(reset)} s` : "try again in a minute";
  return `SnapTrade's rate limit for this account was reached${what}; ${when}`;
}
