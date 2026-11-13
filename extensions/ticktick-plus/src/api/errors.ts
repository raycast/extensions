/**
 * Error carrying the HTTP status of a failed TickTick request.
 *
 * Callers need to tell "this resource does not exist" apart from "the API is unreachable,
 * rate limited, or rejecting our token" — a distinction that is lost when the status only
 * appears inside the message text.
 *
 * Kept dependency-free so it can be imported from anywhere without pulling in the client.
 */
export class TickTickApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "TickTickApiError";
    this.status = status;
  }
}

/** True when the error is a TickTick response with the given status. */
export function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof TickTickApiError && error.status === status;
}
