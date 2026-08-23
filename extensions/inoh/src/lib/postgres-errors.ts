/** Postgres error code for a unique constraint violation. */
const POSTGRES_UNIQUE_VIOLATION = "23505";

/**
 * Returns true when a Supabase error represents a unique constraint violation.
 *
 * Reason: Supabase may return the violation as a postgres code or as a message
 * string depending on the client version and error context.
 *
 * @param error - Error object returned by a Supabase query
 * @returns Whether the error is a unique constraint violation
 */
export function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return (
    error.code === POSTGRES_UNIQUE_VIOLATION ||
    !!error.message?.includes("duplicate") ||
    !!error.message?.includes("unique")
  );
}

/** Marker prefix the backend puts on card-limit trigger errors. */
const CARD_LIMIT_MARKER = "CARD_LIMIT";

/** Fallback shown when a card-limit error carries no message after the marker. */
const GENERIC_CARD_LIMIT_MESSAGE = "You've reached your plan's card limit.";

/**
 * Returns true when a Supabase error represents a per-plan card-limit violation.
 *
 * Reason: the backend raises card-limit errors with SQLSTATE P0001, but that
 * code is shared with other triggers (e.g. the daily card-request limit), so
 * the CARD_LIMIT message marker is the only reliable discriminator.
 *
 * @param error - Error object returned by a Supabase query
 * @returns Whether the error is a card-limit violation
 */
export function isCardLimitViolation(error: { code?: string; message?: string }): boolean {
  return !!error.message?.includes(CARD_LIMIT_MARKER);
}

/**
 * Strips the `CARD_LIMIT:` marker prefix from a card-limit error message,
 * leaving the human-readable part meant for display.
 *
 * @param message - Raw error message from the backend trigger
 * @returns The message without the marker, or a generic fallback if empty
 */
export function stripCardLimitMarker(message: string): string {
  const markerPrefixPattern = new RegExp(`^.*${CARD_LIMIT_MARKER}:\\s*`);
  const strippedMessage = message.replace(markerPrefixPattern, "").trim();
  return strippedMessage || GENERIC_CARD_LIMIT_MESSAGE;
}
