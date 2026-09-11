export class DescriptApiError extends Error {
  status: number;
  retryAfterSeconds?: number;
  body?: string;

  constructor(status: number, message: string, opts?: { retryAfterSeconds?: number; body?: string }) {
    super(message);
    this.name = "DescriptApiError";
    this.status = status;
    this.retryAfterSeconds = opts?.retryAfterSeconds;
    this.body = opts?.body;
  }

  /**
   * Maps an HTTP status to a user-friendly explanation that matches the
   * documented Descript error model (401/402/403/404/409/429).
   */
  friendlyMessage(): string {
    switch (this.status) {
      case 401:
        return "Authentication failed. Check the Descript API token in extension preferences.";
      case 402:
        return "Your Descript plan is out of media minutes or AI credits for this operation.";
      case 403:
        return "Forbidden. The token may not have access to this drive or resource.";
      case 404:
        return "The requested project or job could not be found.";
      case 409:
        return "Conflict. The resource is in an invalid state for this action.";
      case 429: {
        const wait = this.retryAfterSeconds ? ` Try again in ~${this.retryAfterSeconds}s.` : "";
        return `Rate limit reached.${wait}`;
      }
      default:
        if (this.status >= 500) {
          return `Descript service error (${this.status}). Try again shortly.`;
        }
        return this.message || `Request failed (${this.status}).`;
    }
  }
}

export function isMissingTokenError(error: unknown): boolean {
  return error instanceof Error && error.name === "MissingTokenError";
}

export function isInvalidTokenError(error: unknown): boolean {
  return error instanceof Error && error.name === "InvalidTokenError";
}

export function isAuthRelatedError(error: unknown): boolean {
  if (error instanceof DescriptApiError && error.status === 401) return true;
  return isMissingTokenError(error) || isInvalidTokenError(error);
}

export function formatLoadError(error: unknown): string {
  if (error instanceof DescriptApiError) return error.friendlyMessage();
  if (error instanceof Error) return error.message;
  return String(error);
}
