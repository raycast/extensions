/**
 * The Nyxe `/api/v1` client — the one module that talks to Nyxe.
 *
 * Pure on purpose: no `@raycast/api` import, so the same code runs in the
 * commands, the AI tools, the unit tests and `scripts/smoke.ts` (plain Node).
 * Raycast glue (preferences, toasts) lives in `./raycast.ts`.
 *
 * Types mirror the contract in the Nyxe repo at
 * `convex/features/api/README.md`.
 */

export const DEFAULT_API_BASE_URL = "https://convex-site.nyxe.app";

export type ApiScope = "mail:read" | "mail:triage" | "mail:send";

export interface Address {
  email: string;
  name: string | null;
}

export interface Me {
  user: { id: string; email: string | null; name: string | null };
  org: { id: string };
  token: { id: string; scopes: ApiScope[]; expiresAt: number };
  /** This deployment's web app, e.g. `https://nyxe.app`. */
  webUrl: string;
  addresses: {
    primary: string;
    aliases: string[];
    sendAs: { address: string; name: string }[];
  };
}

export interface SignInMatch {
  code?: string;
  link?: string;
  /** Our own mail server vouched for the sender (always true for a link). */
  senderVerified: boolean;
  from: Address | null;
  subject: string | null;
  receivedAt: number;
  threadId: string;
}

export interface SearchResult {
  emailId: string;
  threadId: string;
  from: Address | null;
  subject: string | null;
  preview: string | null;
  receivedAt: number;
  hasAttachment: boolean;
  /** The server read this as sign-in or verification mail. */
  isSignIn: boolean;
}

export interface SearchPage {
  results: SearchResult[];
  total: number;
  nextPosition: number | null;
}

export interface ThreadMessage {
  /** The server read this as sign-in or verification mail. */
  isSignIn: boolean;
  id: string;
  from: Address[];
  to: Address[];
  cc: Address[];
  replyTo: Address[];
  subject: string | null;
  receivedAt: number;
  sentAt: number | null;
  isUnread: boolean;
  isStarred: boolean;
  text: string;
  textTruncated: boolean;
  attachments: { name: string | null; contentType: string | null; size: number }[];
  headers: { messageId: string; date: string };
}

export interface Thread {
  threadId: string;
  subject: string | null;
  openUrl: string;
  messages: ThreadMessage[];
}

export interface InboxThread {
  threadId: string;
  subject: string | null;
  /** The server read this as sign-in or verification mail. */
  isSignIn: boolean;
  messageCount: number;
  lastMessage: {
    id: string;
    from: Address;
    preview: string | null;
    receivedAt: number;
    hasAttachment: boolean;
    isUnread: boolean;
  };
}

export interface InboxPage {
  threads: InboxThread[];
  nextCursor: string | null;
  total: number | null;
}

export interface InboxSummary {
  unread: number;
  threads: {
    threadId: string;
    emailId: string;
    subject: string | null;
    from: Address | null;
    preview: string | null;
    receivedAt: number;
    isUnread: boolean;
  }[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  createdAt: number;
}

export interface Contact {
  email: string;
  name: string | null;
}

export interface SnoozedThread {
  threadId: string;
  wakeAt: number;
  emailCount: number;
}

export interface UploadedAttachment {
  blobId: string;
  name: string;
  type: string;
  size: number;
}

export type Recipient = string | { email: string; name?: string };

export interface SendInput {
  from?: string;
  to: Recipient[];
  cc?: Recipient[];
  bcc?: Recipient[];
  subject: string;
  text: string;
  attachments?: UploadedAttachment[];
}

export type ApiErrorCode =
  | "bad_request"
  | "unsupported_account"
  | "unauthorized"
  | "insufficient_scope"
  | "forbidden"
  | "not_found"
  | "payload_too_large"
  | "rate_limited"
  | "mailbox_unavailable"
  | "upstream_error"
  | "internal"
  | "network_error";

/** Every failure the client reports: the API's own error, or a transport one. */
// Plain fields, not constructor parameter properties: `scripts/smoke.ts` runs
// this file through Node's type stripping, which refuses those.
export class NyxeApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly scope?: ApiScope;
  readonly retryAfterSeconds?: number;

  constructor(status: number, code: ApiErrorCode, message: string, scope?: ApiScope, retryAfterSeconds?: number) {
    super(message);
    this.name = "NyxeApiError";
    this.status = status;
    this.code = code;
    this.scope = scope;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface ClientOptions {
  token: string;
  baseUrl?: string;
  /** Injected in tests. */
  fetch?: typeof fetch;
}

/** Trim, drop trailing slashes, and fall back to production for a blank value. */
export function normalizeBaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  return trimmed || DEFAULT_API_BASE_URL;
}

type Query = Record<string, string | number | boolean | undefined | null>;

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function toError(res: Response): Promise<NyxeApiError> {
  let code: ApiErrorCode = "internal";
  let message = `Nyxe answered ${res.status}`;
  let scope: ApiScope | undefined;
  try {
    const body = (await res.json()) as {
      error?: { code?: ApiErrorCode; message?: string; scope?: ApiScope };
    };
    if (body.error?.code) code = body.error.code;
    if (body.error?.message) message = body.error.message;
    scope = body.error?.scope;
  } catch {
    // Not our JSON (a proxy's HTML page): keep the status-derived message.
  }
  const retryAfter = Number(res.headers.get("retry-after"));
  return new NyxeApiError(
    res.status,
    code,
    message,
    scope,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  );
}

/** A typed client for `/api/v1`. */
export function createClient({ token, baseUrl, fetch: fetchImpl = fetch }: ClientOptions) {
  const base = `${normalizeBaseUrl(baseUrl)}/api/v1`;

  async function request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    {
      query,
      json,
      body,
      contentType,
    }: { query?: Query; json?: unknown; body?: RequestInit["body"]; contentType?: string } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
    };
    if (json !== undefined) headers["Content-Type"] = "application/json";
    else if (contentType) headers["Content-Type"] = contentType;
    let res: Response;
    try {
      res = await fetchImpl(`${base}${withQuery(path, query)}`, {
        method,
        headers,
        body: json !== undefined ? JSON.stringify(json) : body,
      });
    } catch (err) {
      throw new NyxeApiError(
        0,
        "network_error",
        `Couldn't reach Nyxe${err instanceof Error && err.message ? ` (${err.message})` : ""}`,
      );
    }
    if (!res.ok) throw await toError(res);
    return (await res.json()) as T;
  }

  const id = (value: string) => encodeURIComponent(value);

  return {
    me: () => request<Me>("GET", "/me"),
    latestSignIn: (opts: { kind?: "code" | "link" | "any"; withinMinutes?: number } = {}) =>
      request<{ match: SignInMatch | null }>("GET", "/codes/latest", {
        query: { kind: opts.kind ?? "any", withinMinutes: opts.withinMinutes ?? 15 },
      }).then((r) => r.match),
    search: (q: string, opts: { limit?: number; position?: number } = {}) =>
      request<SearchPage>("GET", "/search", { query: { q, limit: opts.limit, position: opts.position } }),
    thread: (threadId: string) => request<Thread>("GET", `/threads/${id(threadId)}`),
    inbox: (opts: { unread?: boolean; limit?: number; cursor?: string | null } = {}) =>
      request<InboxPage>("GET", "/inbox", {
        query: { unread: opts.unread ? "true" : undefined, limit: opts.limit, cursor: opts.cursor },
      }),
    inboxSummary: () => request<InboxSummary>("GET", "/inbox/summary"),
    tags: () => request<{ tags: Tag[] }>("GET", "/tags").then((r) => r.tags),
    threadTags: (threadId: string) =>
      request<{ tags: Tag[] }>("GET", `/threads/${id(threadId)}/tags`).then((r) => r.tags),
    contacts: (prefix: string) =>
      request<{ contacts: Contact[] }>("GET", "/contacts", { query: { prefix } }).then((r) => r.contacts),
    snoozed: () => request<{ threads: SnoozedThread[] }>("GET", "/snoozed").then((r) => r.threads),
    markRead: (threadId: string, read: boolean) =>
      request<{ updated: number }>("POST", `/threads/${id(threadId)}/${read ? "read" : "unread"}`),
    archive: (threadId: string) => request<{ moved: number }>("POST", `/threads/${id(threadId)}/archive`),
    snooze: (threadId: string, wakeAt: number) =>
      request<{ snoozed: number }>("POST", `/threads/${id(threadId)}/snooze`, { json: { wakeAt } }),
    unsnooze: (threadId: string) => request<{ restored: number }>("POST", `/threads/${id(threadId)}/unsnooze`),
    setTag: (threadId: string, tagId: string, on: boolean) =>
      request<{ ok: true }>(on ? "POST" : "DELETE", `/threads/${id(threadId)}/tags/${id(tagId)}`),
    uploadAttachment: (name: string, bytes: Uint8Array, type: string) =>
      request<UploadedAttachment>("POST", "/attachments", {
        query: { name },
        body: bytes as unknown as RequestInit["body"],
        contentType: type || "application/octet-stream",
      }),
    send: (input: SendInput) => request<{ emailId: string; threadId: string | null }>("POST", "/send", { json: input }),
    replyDraft: (threadId: string, input: { text: string; replyAll?: boolean }) =>
      request<{ draftId: string; threadId: string; openUrl: string }>("POST", `/threads/${id(threadId)}/reply-draft`, {
        json: input,
      }),
  };
}

export type NyxeClient = ReturnType<typeof createClient>;
