/** Twelfth won't accept this install's credential. Cached data from before it is no longer this person's to show. */
export class AuthError extends Error {}

/** No usable OAuth session: never signed in, or the connection was ended in Twelfth. */
export class NotSignedInError extends AuthError {
  constructor(message = "Not connected to Twelfth") {
    super(message);
  }
}

/**
 * The workspace doesn't have the feature behind a tool, or the person didn't
 * allow this connection to use it. Affects the card or formula that needed it,
 * not the whole surface.
 */
export class ToolUnavailableError extends Error {
  constructor(readonly tool: string) {
    super(
      `This connection can't use ${tool}. Your workspace may not have the feature, or the connection wasn't allowed it.`,
    );
  }
}

/** Over the request limit (120 a minute per workspace key, 240 per transport). */
export class RateLimitedError extends Error {
  constructor(readonly retryAfterSeconds?: number) {
    super(`Twelfth is busy. Try again in ${retryAfterSeconds ? `${retryAfterSeconds}s` : "a minute"}.`);
  }
}
