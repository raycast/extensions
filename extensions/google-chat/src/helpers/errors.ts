/** Google API error parsing and classification. Pure: no Raycast imports. */

export class GoogleApiError extends Error {
  /** HTTP status code. */
  readonly status: number;
  /** gRPC-style status string from the error body, e.g. `PERMISSION_DENIED`. */
  readonly statusText?: string;
  /** `ErrorInfo.reason` from the error details, e.g. `ACCESS_TOKEN_SCOPE_INSUFFICIENT`. */
  readonly reason?: string;
  readonly retryAfterMs?: number;

  constructor(message: string, init: { status: number; statusText?: string; reason?: string; retryAfterMs?: number }) {
    super(message);
    this.name = "GoogleApiError";
    this.status = init.status;
    this.statusText = init.statusText;
    this.reason = init.reason;
    this.retryAfterMs = init.retryAfterMs;
  }
}

interface GoogleErrorBody {
  error?:
    | {
        code?: number;
        message?: string;
        status?: string;
        details?: { "@type"?: string; reason?: string }[];
      }
    | string;
  error_description?: string;
}

/** Builds a {@link GoogleApiError} from an HTTP status and response body text. */
export function parseGoogleError(status: number, bodyText: string, retryAfterMs?: number): GoogleApiError {
  let message = bodyText.trim() || `HTTP ${status}`;
  let statusText: string | undefined;
  let reason: string | undefined;
  try {
    const body = JSON.parse(bodyText) as GoogleErrorBody;
    if (typeof body.error === "string") {
      message = body.error_description ? `${body.error}: ${body.error_description}` : body.error;
    } else if (body.error) {
      message = body.error.message || message;
      statusText = body.error.status;
      reason = body.error.details?.find((d) => d.reason)?.reason;
    }
  } catch {
    // Not JSON; keep the raw text (trimmed so an HTML error page doesn't flood a toast).
    message = message.slice(0, 300);
  }
  return new GoogleApiError(message, { status, statusText, reason, retryAfterMs });
}

/** 429 and transient 5xx responses are worth retrying. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}

/** The token is missing a scope the request needs (for example after a scope was added to the extension). */
export function isScopeError(error: unknown): boolean {
  if (error instanceof GoogleApiError) {
    if (error.reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT") return true;
    if (error.status === 403 && /insufficient authentication scopes/i.test(error.message)) return true;
  }
  return /ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient authentication scopes/i.test(messageOf(error));
}

/** The stored sign-in can't be used any more and the user has to sign in again. */
export function isAuthError(error: unknown): boolean {
  if (error instanceof GoogleApiError && error.status === 401) return true;
  return /invalid_grant|Error while fetching tokens|Could not initialize OAuth|Request had invalid authentication credentials|UNAUTHENTICATED/i.test(
    messageOf(error),
  );
}

/** Raycast can't show the OAuth screen because the command runs in the background. */
export function isBackgroundAuthError(error: unknown): boolean {
  return /OAuth request creation is not available when command is launched in background/i.test(messageOf(error));
}

/** The signed-in account isn't a Google Workspace account (Chat API is Workspace-only). */
export function isWorkspaceOnlyError(error: unknown): boolean {
  const message = messageOf(error);
  if (/configure the (Chat )?app|Chat app not found/i.test(message)) return false;
  return /Google Workspace|consumer account|personal (Google )?account|not available (to|for) (consumer|personal)/i.test(
    message,
  );
}

/** The Cloud project hasn't filled in the Chat API "Configuration" page, which user-auth writes require. */
export function isChatAppNotConfiguredError(error: unknown): boolean {
  return /Chat app not found|configure the (Chat )?app/i.test(messageOf(error));
}

/** The API isn't enabled in the Google Cloud project that owns the client ID. */
export function isApiDisabledError(error: unknown): boolean {
  if (error instanceof GoogleApiError && error.reason === "SERVICE_DISABLED") return true;
  return /has not been used in project|is disabled|SERVICE_DISABLED/i.test(messageOf(error));
}

export interface FriendlyError {
  title: string;
  message: string;
  /** Show a "Sign in Again" action. */
  signInAgain?: boolean;
}

/** Turns any error into a short title and a readable explanation for toasts and empty views. */
export function describeError(error: unknown): FriendlyError {
  const message = messageOf(error) || "Unknown error";
  if (isWorkspaceOnlyError(error)) {
    return {
      title: "Google Workspace account required",
      message:
        "The Google Chat API only works with Google Workspace (Business or Enterprise) accounts. Sign in again with a Workspace account.",
      signInAgain: true,
    };
  }
  if (isScopeError(error)) {
    return {
      title: "More permissions needed",
      message: "Your sign-in is missing a Google permission this command needs. Sign in again to grant it.",
      signInAgain: true,
    };
  }
  if (isAuthError(error)) {
    return { title: "Sign-in expired", message: "Sign in to Google again to continue.", signInAgain: true };
  }
  if (isApiDisabledError(error)) {
    return {
      title: "API not enabled",
      message: `Enable the Google Chat API and People API in the Google Cloud project of your client ID. ${message}`,
    };
  }
  if (isChatAppNotConfiguredError(error)) {
    return {
      title: "Chat app not configured",
      message:
        "Fill in the Google Chat API Configuration page (app name, avatar URL, description) in your Google Cloud project.",
    };
  }
  if (error instanceof GoogleApiError) {
    if (error.status === 429) {
      return { title: "Rate limited", message: "Google Chat is limiting requests. Try again in a minute." };
    }
    if (error.status === 404) return { title: "Not found", message };
    if (error.status === 403) return { title: "Permission denied", message };
  }
  return { title: "Google Chat error", message };
}
