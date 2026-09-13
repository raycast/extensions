/**
 * Normalized API error. `status` is the HTTP status (0 for network failures),
 * `message` is a user-facing message already mapped from the API response.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Raised when there is no stored session and a command needs authentication. */
export class NotAuthenticatedError extends ApiError {
  constructor(message = "You need to connect your Expiration Reminder account.") {
    super(message, 401);
    this.name = "NotAuthenticatedError";
  }
}

/**
 * Map an HTTP status + parsed body into a friendly, consistent message.
 * The API returns `{ ok: false, message }` for v1 errors and
 * `{ error, error_description }` for OAuth errors.
 */
export function messageForStatus(status: number, body: unknown): string {
  const apiMessage =
    (isRecord(body) && typeof body.message === "string" && body.message) ||
    (isRecord(body) && typeof body.error_description === "string" && body.error_description) ||
    undefined;

  switch (status) {
    case 400:
    case 409:
      return apiMessage ?? "The request was rejected. Please check the values and try again.";
    case 401:
      return apiMessage ?? "Your session expired. Please connect again.";
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return apiMessage ?? "Not found.";
    case 429:
      return "Too many requests. Please slow down and try again shortly.";
    default:
      if (status >= 500) return "Expiration Reminder had a problem. Please try again.";
      if (status === 0) return "Couldn't reach Expiration Reminder. Check your internet connection.";
      return apiMessage ?? `Unexpected error (HTTP ${status}).`;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
