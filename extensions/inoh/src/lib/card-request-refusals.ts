import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Turning a refused `card_requests` write into something worth reading.
 *
 * Reason: the gates are in the database, not in this client, so their answers
 * are translated rather than predicted. Submitting meets the monthly
 * allowance, today's ceiling, the unique index on work already in flight, and
 * the check that a word being asked for carries a meaning. The messages match
 * the web app's `lib/card-request-errors`, because the same refusal read two
 * different ways is worse than either wording.
 */

const POSTGRES_UNIQUE_VIOLATION = "23505";
const POSTGRES_CHECK_VIOLATION = "23514";

/** Prefixes the database uses, so each refusal gets its own explanation. */
const MONTHLY_LIMIT_MARKER = "PRIVATE_CARD_LIMIT:";
const DAILY_CEILING_MARKER = "DAILY_CARD_REQUEST_LIMIT";
const CLIENT_WRITE_MARKER = "CARD_REQUEST_CLIENT_WRITE:";
const RETRY_LIMIT_MARKER = "CARD_REQUEST_RETRY_LIMIT:";
const CONTEXT_CONSTRAINT = "card_requests_context_check";

const ACTIVE_REQUEST_EXISTS_MESSAGE = "You already have an active request for this word.";
const DAILY_LIMIT_REACHED_MESSAGE = "You've hit today's request limit. Try again tomorrow!";
const DEFINITION_REQUIRED_MESSAGE = "Add a definition before asking for this card.";
const RETRY_LIMIT_REACHED_MESSAGE = "This one has already been retried three times.";
const UNKNOWN_FAILURE_MESSAGE = "Something went wrong. Please try again.";

/** The half of a prefixed database message that was written for the user. */
function _readAfterMarker(message: string, marker: string): string {
  return message.split(marker)[1]?.trim() ?? message;
}

export type CardRequestRefusal = {
  message: string;
  /** True when the web app's plans page is the way past this refusal. */
  isPlanLimit: boolean;
};

/**
 * Explains why a card request was refused.
 *
 * @param error - The error PostgREST returned
 * @returns A message for the user, and whether upgrading is the way past it
 */
export function describeCardRequestRefusal(error: PostgrestError): CardRequestRefusal {
  if (error.code === POSTGRES_UNIQUE_VIOLATION) {
    return { message: ACTIVE_REQUEST_EXISTS_MESSAGE, isPlanLimit: false };
  }

  // Reason: the only check a client can trip is the one requiring a meaning on
  // anything leaving draft, and the composer refuses to send without one, so
  // reaching this means the draft was emptied somewhere else in the meantime.
  if (error.code === POSTGRES_CHECK_VIOLATION && error.message.includes(CONTEXT_CONSTRAINT)) {
    return { message: DEFINITION_REQUIRED_MESSAGE, isPlanLimit: false };
  }

  if (error.message.includes(MONTHLY_LIMIT_MARKER)) {
    return {
      message: _readAfterMarker(error.message, MONTHLY_LIMIT_MARKER),
      isPlanLimit: true,
    };
  }

  if (error.message.includes(DAILY_CEILING_MARKER)) {
    return { message: DAILY_LIMIT_REACHED_MESSAGE, isPlanLimit: false };
  }

  if (error.message.includes(RETRY_LIMIT_MARKER)) {
    return { message: RETRY_LIMIT_REACHED_MESSAGE, isPlanLimit: false };
  }

  if (error.message.includes(CLIENT_WRITE_MARKER)) {
    return {
      message: _readAfterMarker(error.message, CLIENT_WRITE_MARKER),
      isPlanLimit: false,
    };
  }

  return { message: UNKNOWN_FAILURE_MESSAGE, isPlanLimit: false };
}
