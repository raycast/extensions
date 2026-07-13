/**
 * Dokploy returns errors as a bare `{ message, code, issues }` object - there is no
 * success envelope around responses, so a failure is only ever signalled by the HTTP status.
 */
export interface DokployErrorBody {
  message: string;
  code: string;
  issues?: { message: string }[];
}

export class DokployApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: string[];

  constructor(status: number, body: Partial<DokployErrorBody> | undefined, fallback: string) {
    super(body?.message?.trim() || fallback);
    this.name = "DokployApiError";
    this.status = status;
    this.code = body?.code ?? "UNKNOWN";
    this.issues = (body?.issues ?? []).map((issue) => issue.message).filter(Boolean);
  }

  /** True when the account's API key is missing, wrong or lacks access. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** A message worth putting in front of the user, with the validation issues folded in. */
  get displayMessage(): string {
    if (this.isAuthError) {
      return "The API key was rejected. Check the key and URL for this account.";
    }
    return this.issues.length > 0 ? `${this.message} (${this.issues.join(", ")})` : this.message;
  }
}

export class DokployNetworkError extends Error {
  constructor(url: string, cause: unknown) {
    super(`Could not reach ${url}. Check the server URL and that the instance is online.`);
    this.name = "DokployNetworkError";
    this.cause = cause;
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof DokployApiError) return error.displayMessage;
  if (error instanceof Error) return error.message;
  return String(error);
}
