// Error classification for Keito API failures. Messages are built only from status codes and
// server-provided error text, never from request headers, so credentials cannot leak into toasts,
// logs, or status output.

export type KeitoErrorKind =
  | "missing_credentials"
  | "malformed_credentials"
  | "invalid_credentials"
  | "read_only_key"
  | "company_mismatch"
  | "tracking_not_allowed"
  | "signed_out"
  | "forbidden"
  | "not_found"
  | "running_timer_conflict"
  | "locked"
  | "conflict"
  | "validation"
  | "rate_limited"
  | "server"
  | "network"
  | "timeout"
  | "unexpected_response";

export interface KeitoErrorDetails {
  status?: number;
  code?: string;
  serverMessage?: string;
  runningEntryId?: string;
  retryAfterSeconds?: number;
}

export class KeitoError extends Error {
  readonly kind: KeitoErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly serverMessage?: string;
  readonly runningEntryId?: string;
  readonly retryAfterSeconds?: number;

  constructor(kind: KeitoErrorKind, message: string, details: KeitoErrorDetails = {}) {
    super(message);
    this.name = "KeitoError";
    this.kind = kind;
    this.status = details.status;
    this.code = details.code;
    this.serverMessage = details.serverMessage;
    this.runningEntryId = details.runningEntryId;
    this.retryAfterSeconds = details.retryAfterSeconds;
  }

  /** True when the problem can only be fixed by changing the extension preferences. */
  get isSetupProblem(): boolean {
    return [
      "missing_credentials",
      "malformed_credentials",
      "invalid_credentials",
      "read_only_key",
      "company_mismatch",
      "tracking_not_allowed",
      "signed_out",
    ].includes(this.kind);
  }
}

export function isKeitoError(error: unknown): error is KeitoError {
  return error instanceof KeitoError;
}

interface ErrorBody {
  error?: unknown;
  error_description?: unknown;
  message?: unknown;
  running_entry?: { id?: unknown } | null;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const LOCK_PATTERN = /\b(locked|approved|approval|closed|submitted)\b/i;

/** Map an HTTP error response to a KeitoError. */
export function errorFromResponse(status: number, body: unknown, retryAfterSeconds?: number): KeitoError {
  const data: ErrorBody = body && typeof body === "object" ? (body as ErrorBody) : {};
  const code = text(data.error);
  const serverMessage = text(data.error_description) ?? text(data.message);
  const details: KeitoErrorDetails = { status, code, serverMessage, retryAfterSeconds };

  if (status === 401) {
    return new KeitoError(
      "invalid_credentials",
      /company/i.test(serverMessage ?? "")
        ? "Keito rejected the API key or Company ID. Check both in the extension preferences; the Company ID is in Settings → API & Developers. The key may also have been revoked or rotated."
        : "Keito rejected the API key. Check the Keito Integration API Key in the extension preferences, or ask your administrator whether it was revoked or rotated.",
      details,
    );
  }
  if (status === 400 && /keito-account-id/i.test(serverMessage ?? "")) {
    return new KeitoError(
      "invalid_credentials",
      "Keito did not accept the Company ID. Copy it from Settings → API & Developers → Company ID.",
      details,
    );
  }
  // Live Keito returns 403 "This time entry is locked and cannot be edited/restarted" for approved
  // time; the docs describe 409. Treat either as a lock when the message says so.
  if (
    (status === 403 || status === 409 || status === 422) &&
    LOCK_PATTERN.test(`${code ?? ""} ${serverMessage ?? ""}`)
  ) {
    return new KeitoError(
      "locked",
      serverMessage ?? "This time entry is approved or locked and cannot be changed.",
      details,
    );
  }
  if (status === 403) {
    return new KeitoError(
      "forbidden",
      serverMessage ??
        "Your Keito identity is not allowed to do this. Check that you are assigned to the project and that the key is a full-access integration key.",
      details,
    );
  }
  if (status === 404) {
    return new KeitoError(
      "not_found",
      serverMessage ?? "Keito could not find that record, or it is not visible to your identity.",
      details,
    );
  }
  if (status === 409 && code === "running_timer_conflict") {
    const runningId = data.running_entry?.id;
    return new KeitoError("running_timer_conflict", serverMessage ?? "A timer is already running.", {
      ...details,
      runningEntryId: typeof runningId === "string" || typeof runningId === "number" ? String(runningId) : undefined,
    });
  }
  if (status === 409) {
    return new KeitoError("conflict", serverMessage ?? "Keito reported a conflict.", details);
  }
  if (status === 400 || status === 422) {
    return new KeitoError("validation", serverMessage ?? "Keito rejected the request.", details);
  }
  if (status === 429) {
    return new KeitoError(
      "rate_limited",
      retryAfterSeconds
        ? `Keito is rate limiting requests. Try again in ${retryAfterSeconds} seconds.`
        : "Keito is rate limiting requests. Try again shortly.",
      details,
    );
  }
  if (status >= 500) {
    return new KeitoError("server", "Keito had a server error. Try again shortly.", details);
  }
  return new KeitoError("unexpected_response", serverMessage ?? `Keito returned HTTP ${status}.`, details);
}

/** Short title for a toast or empty view. */
export function errorTitle(error: unknown): string {
  if (!isKeitoError(error)) return "Something went wrong";
  switch (error.kind) {
    case "missing_credentials":
      return "Connect Keito";
    case "malformed_credentials":
      return "Check Keito Preferences";
    case "invalid_credentials":
      return "Keito Rejected the Credentials";
    case "read_only_key":
      return "Full-Access Key Required";
    case "company_mismatch":
      return "Company ID Mismatch";
    case "tracking_not_allowed":
      return "Time Tracking Not Allowed";
    case "signed_out":
      return "Sign In to Keito";
    case "forbidden":
      return "Not Allowed";
    case "not_found":
      return "Not Found";
    case "running_timer_conflict":
      return "A Timer Is Already Running";
    case "locked":
      return "Entry Is Locked";
    case "conflict":
      return "Conflict";
    case "validation":
      return "Keito Rejected the Entry";
    case "rate_limited":
      return "Rate Limited";
    case "server":
      return "Keito Server Error";
    case "network":
      return "Cannot Reach Keito";
    case "timeout":
      return "Keito Timed Out";
    default:
      return "Unexpected Keito Response";
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
