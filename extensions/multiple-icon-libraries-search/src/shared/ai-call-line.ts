/** Errors that another model can't fix: Raycast's request limit. */
export function isRateLimitError(error: unknown): boolean {
  return /too many requests|rate limit/i.test(String(error));
}
