/** Why a Reddit request failed, so the UI can react differently per cause. */
export type RedditErrorCategory = "rateLimited" | "blocked" | "network" | "parse" | "unknown";

export class RedditError extends Error {
  readonly category: RedditErrorCategory;
  /** Seconds until the rate limit resets. Only meaningful for `rateLimited`. */
  readonly retryAfterSeconds?: number;

  constructor(category: RedditErrorCategory, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "RedditError";
    this.category = category;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isRateLimited(error: unknown): error is RedditError {
  return error instanceof RedditError && error.category === "rateLimited";
}
