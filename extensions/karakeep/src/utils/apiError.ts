/**
 * HTTP failures from the Karakeep API, carrying the status code.
 *
 * `throw new Error("HTTP 401")` loses the one thing callers need to react
 * differently: a 401 is not a transient failure the user can retry their way
 * out of. The key in Extension Settings is wrong or revoked, every subsequent
 * request will fail identically, and the only useful response is to send the
 * user to Settings — not to show "Couldn't load bookmarks" and keep polling.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Whether the API rejected our credentials.
 *
 * 401 only, deliberately. Karakeep answers a bad or revoked API key with a 401;
 * treating 403 the same way would let a per-resource permission failure blank
 * an entire view and send the user off to re-check a key that is fine.
 *
 * Structural rather than `instanceof`, and deliberately not narrowed to Error
 * either: an error that crosses a serialization boundary can arrive as a plain
 * `{ message, status }`, and a detector that silently stops matching is worse
 * than no detector at all — the user would be back to a bare "HTTP 401".
 */
export function isAuthError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as Partial<ApiError>).status === 401;
}

interface ZodIssue {
  path?: (string | number)[];
  message?: string;
}

/**
 * Turn an error body into something a toast can actually show. Karakeep
 * serializes validation failures as `{ error: { name: "ZodError", message } }`
 * where `message` is itself a JSON string holding the issue array — so the
 * useful part is two levels of encoding deep, and reading `error.issues`
 * alone leaves you with a bare "HTTP 400".
 */
/**
 * Strip anything credential-shaped out of a string bound for the UI.
 *
 * Applied to EVERY return path below, not just the non-JSON fallback. A proxy
 * that answers `401 {"message":"Bearer ak1_secret"}` — or a Zod issue that
 * happens to quote the header — takes the JSON branch and never reaches the
 * fallback, so redacting only there leaks the key into the toast and, worse,
 * into whatever the user pastes into a bug report from "Copy Error".
 */
function redact(text: string): string {
  return text.replace(/\bBearer\s+\S+/gi, "Bearer [redacted]").replace(/\bak1_\S+/gi, "[redacted]");
}

export function describeApiError(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body);

    // The /api/trpc endpoints (search, summarize) answer a `batch=1` request
    // with a top-level ARRAY, so the error hides one index deeper and under a
    // `json` envelope. Reading `parsed.error` on an array yields undefined,
    // which is how these two commands ended up reporting a bare status code.
    const entry = Array.isArray(parsed) ? parsed[0] : parsed;
    const err = entry?.error?.json ?? entry?.error;

    let issues: ZodIssue[] | undefined = Array.isArray(err?.issues) ? err.issues : undefined;
    if (!issues && typeof err?.message === "string") {
      try {
        const nested = JSON.parse(err.message);
        if (Array.isArray(nested)) issues = nested;
      } catch {
        // error.message is prose, not encoded issues — handled below.
      }
    }

    const described = issues
      ?.map((issue) => (issue.path?.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
      .filter(Boolean);
    if (described?.length) return redact(described.join("; "));

    if (typeof err === "string") return redact(err);
    if (typeof err?.message === "string") return redact(err.message);
    if (typeof entry?.message === "string") return redact(entry.message);
  } catch {
    // body is not JSON, fall through to the status line
  }
  // Karakeep answers a rejected API key with the plain-text body "Unauthorized"
  // and nothing else, so the JSON paths above can never reach it. Carry a short
  // non-JSON body through rather than throwing away the only words the server
  // said — the difference between a copyable "HTTP 401 — Unauthorized" and a
  // bare status code.
  //
  // This string reaches a toast AND the clipboard, which the raw body never did
  // before, so an HTML error page from a proxy is dropped as markup rather than
  // a message, and anything credential-shaped is redacted.
  const plain = redact(body.trim().replace(/\s+/g, " "));
  if (!plain || plain.startsWith("<") || plain.length > 200) return `HTTP ${status}`;
  return `HTTP ${status} — ${plain}`;
}

/**
 * The API key the server has already rejected during this command run.
 *
 * Gating each hook on a reachability probe fixes the views that HAVE a gate and
 * misses every one that doesn't — `BookmarksList` fetching lists for its Add to
 * List submenu, `BookmarkEdit` fetching tags, and any hook added later by
 * someone who doesn't know the rule. Forgetting the guard is the failure this
 * codebase keeps tripping over, so the stop lives in the fetch layer instead:
 * one 401 and every remaining request in the run short-circuits without touching
 * the network. That is what turns a cascade of toasts into a single one.
 *
 * Keyed on the credential rather than a boolean so it heals itself — change the
 * key in Extension Settings and the next request no longer matches, so it goes
 * out for real. A bare latch would keep refusing a key that is now correct.
 */
let rejectedKey: string | undefined;

/** True when this exact key has already been refused; skip the request. */
export function isRejectedKey(apiKey: string): boolean {
  return rejectedKey === apiKey;
}

export function markKeyRejected(apiKey: string) {
  rejectedKey = apiKey;
}

/** A key that works cannot also be a rejected one. */
export function clearRejectedKey(apiKey: string) {
  if (rejectedKey === apiKey) rejectedKey = undefined;
}
