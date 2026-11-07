export function getErrorMsg(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/** HTTP status from our `PlaneApiError` (`status`) or the SDK's `ResponseError` (`response.status`). */
export function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof candidate.status === "number") return candidate.status;
  if (typeof candidate.response?.status === "number") return candidate.response.status;
  return undefined;
}

/** Seconds from a 429's `Retry-After`, as stored on `PlaneApiError.retryAfter`. */
export function getRetryAfter(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = (error as { retryAfter?: unknown }).retryAfter;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export type PlaneErrorDescription = {
  title: string;
  message: string;
  status?: number;
};

/** Maps an API failure to a short title and an actionable message. */
export function describePlaneError(error: unknown): PlaneErrorDescription {
  const status = getErrorStatus(error);
  const raw = getErrorMsg(error);
  // The SDK's generic message adds nothing; prefer the status.
  const detail = raw && raw !== "Response returned an error code" ? raw : status ? `HTTP ${status}` : "Unknown error";

  // Plane answers a key that doesn't match any active token with 403 "Given API token is not valid".
  if ((status === 401 || status === 403) && /token is not valid|invalid token|token.*expired/i.test(raw)) {
    return {
      title: "API key not valid",
      message: `Plane says: "${raw}" (${status}). The key in the extension preferences is expired, revoked, or from another Plane instance. Create a new one in Plane under Profile settings → Personal Access Tokens.`,
      status,
    };
  }
  if (status === 401) {
    return {
      title: "Check your API key",
      message: `Plane didn't accept the credentials (401). Add your API key in the extension preferences. Self-hosted Plane needs an API key; signing in with Plane Cloud doesn't work there.`,
      status,
    };
  }
  if (status === 403) {
    return {
      title: "No access",
      message: `Plane refused the request (403${detail !== "HTTP 403" ? `: ${detail}` : ""}). Check that you are a member of this workspace and project.`,
      status,
    };
  }
  if (status === 404) {
    return {
      title: "Check API Base Path",
      message: `Plane returned 404 (${detail}). Check the API Base Path preference (e.g. https://plane.example.com) and your workspace slug.`,
      status,
    };
  }
  if (status === 402) {
    return {
      title: "Not available on your Plane plan",
      message: `Plane returned 402 (${detail}). This feature isn't enabled for your plan or workspace.`,
      status,
    };
  }
  if (status === 429) {
    const retryAfter = getRetryAfter(error);
    return {
      title: "Plane rate limit reached",
      message:
        retryAfter !== undefined
          ? `Plane asked to wait ${retryAfter} second(s) before retrying.`
          : "Plane allows 60 requests per minute per key. Wait a minute and retry.",
      status,
    };
  }
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(raw)) {
    return {
      title: "Can't reach Plane",
      message: `${raw}. Check the API Base Path preference and your network connection.`,
      status,
    };
  }
  return { title: "Something went wrong", message: detail, status };
}

/**
 * `onError` for list hooks whose screen already shows the failure (ErrorEmptyView or a Detail error).
 * Without it, `useCachedPromise` also shows a toast whose "Copy Logs" text hides the HTTP status.
 */
export function errorShownInline(): void {
  // Intentionally empty: the view renders the error.
}

/**
 * `onError` for hooks shared by lists and forms: silent only for a caller that renders the error itself
 * (`showsErrorInline`). Otherwise undefined, so `useCachedPromise` shows its failure toast.
 */
export function inlineErrorHandler(showsErrorInline: boolean | undefined): (() => void) | undefined {
  return showsErrorInline ? errorShownInline : undefined;
}
