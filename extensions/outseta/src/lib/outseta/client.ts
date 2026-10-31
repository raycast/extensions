import { plainTextToHtml } from "./format";
import { Account, Case, CaseStatus, Page, Person } from "./types";

// Kept free of @raycast/api imports so it can be unit tested with a stubbed fetch.

export interface Credentials {
  subdomain: string;
  apiKey: string;
  secretKey: string;
}

export interface ClientOptions {
  fetch?: typeof fetch;
  /** Shown to customers as the sender of replies. Without it Outseta signs replies with the company name. */
  agentName?: string;
  /** Called before every write. Throw or reject to block it (guards the real account in development). */
  guardWrite?: (description: string, caseUid: string) => void | Promise<void>;
  /** Delay before retrying a 429 that has no Retry-After header, in ms. */
  retryDelayMs?: number;
  /** Requests allowed per window. null turns pacing off (demo data has no limit). */
  rateLimit?: RateLimit | null;
}

export interface RateLimit {
  requests: number;
  windowMs: number;
}

// Outseta allows 7 requests per 5 seconds per API key.
export const OUTSETA_RATE_LIMIT: RateLimit = { requests: 7, windowMs: 5000 };

export class OutsetaError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OutsetaError";
  }
}

export class AuthError extends OutsetaError {
  constructor() {
    super("Outseta rejected the API key or secret key.", 401);
    this.name = "AuthError";
  }
}

export class RateLimitError extends OutsetaError {
  constructor() {
    super("Outseta rate limit reached. Try again in a moment.", 429);
    this.name = "RateLimitError";
  }
}

/** A reply the client refuses to send. Nothing reached Outseta. */
export class ReplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplyError";
  }
}

// Replies posted to spam cases are stored but not emailed.
export function canReply(supportCase: Pick<Case, "Status">): boolean {
  return supportCase.Status !== CaseStatus.Spam;
}

/** Retry-After as a delay in ms: either seconds or an HTTP date. */
export function retryAfterMs(header: string | null, now = Date.now()): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

/** Resolves after ms, or as soon as the signal aborts. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done, { once: true });
  });
}

/** Lets a caller cancel a read it no longer needs, such as the details of a row the user has left. */
export interface RequestOptions {
  signal?: AbortSignal;
}

/**
 * Spaces requests so a burst (moving quickly through list rows loads each row's details) stays
 * inside the limit, and holds every request while Outseta asks to wait after a 429. A request
 * cancelled while it waits gives up its place without using a slot.
 */
function createPacer(limit: RateLimit) {
  const sent: number[] = [];
  let pausedUntil = 0;
  let queue = Promise.resolve();

  return {
    /** Resolves when the next request may go out, in the order they asked. Rejects if the signal aborts first. */
    wait(signal?: AbortSignal): Promise<void> {
      const turn = queue.then(async () => {
        for (;;) {
          signal?.throwIfAborted();
          const now = Date.now();
          while (sent[0] !== undefined && now - sent[0] >= limit.windowMs) sent.shift();
          const oldest = sent[0];
          const windowFull = oldest !== undefined && sent.length >= limit.requests ? oldest + limit.windowMs - now : 0;
          const delay = Math.max(pausedUntil - now, windowFull);
          if (delay <= 0) break;
          await sleep(delay, signal);
        }
        sent.push(Date.now());
      });
      queue = turn.catch(() => undefined);
      return turn;
    },
    pause(ms: number) {
      pausedUntil = Math.max(pausedUntil, Date.now() + ms);
    },
  };
}

export interface SearchParams {
  query?: string;
  page?: number;
}

/** Which cases to list. Omitted criteria don't constrain the results. */
export interface CaseFilter {
  status?: CaseStatus;
  assignee?: "unassigned" | { uid: string };
}

interface ListParams extends SearchParams {
  pageSize?: number;
  fields?: string;
  orderBy?: string;
  filters?: Record<string, string>;
}

function caseFilterParams(filter: CaseFilter): Record<string, string> {
  const params: Record<string, string> = {};
  if (filter.status !== undefined) params.Status = String(filter.status);
  if (filter.assignee === "unassigned") params.AssignedToPersonClientIdentifier__isnull = "true";
  else if (filter.assignee) params.AssignedToPersonClientIdentifier = filter.assignee.uid;
  return params;
}

// Child-object fields cap pages at 25; plain fields allow 100.
export const PERSON_LIST_FIELDS = "Uid,Email,FirstName,LastName,FullName,ProfileImageS3Url,LastLoginDateTime";
export const ACCOUNT_LIST_FIELDS = "Uid,Name,AccountStage,AccountStageLabel";
export const CASE_LIST_FIELDS =
  "Uid,Subject,Status,Source,SubmittedDateTime,LastActivity,AssignedToPersonClientIdentifier,FromPerson.Uid,FromPerson.Email,FromPerson.FullName";

export const PERSON_DETAIL_FIELDS = [
  "*",
  "PersonAccount.*",
  "PersonAccount.Account.*",
  "PersonAccount.Account.CurrentSubscription.*",
  "PersonAccount.Account.CurrentSubscription.Plan.*",
].join(",");
export const ACCOUNT_DETAIL_FIELDS = [
  "*",
  "CurrentSubscription.*",
  "CurrentSubscription.Plan.*",
  "PersonAccount.*",
  "PersonAccount.Person.Uid",
  "PersonAccount.Person.Email",
  "PersonAccount.Person.FullName",
].join(",");
export const CASE_DETAIL_FIELDS = "*,CaseHistories.*,FromPerson.Uid,FromPerson.Email,FromPerson.FullName";

export function createClient(credentials: Credentials, options: ClientOptions = {}) {
  const doFetch = options.fetch ?? fetch;
  const retryDelayMs = options.retryDelayMs ?? 1000;
  const baseUrl = `https://${credentials.subdomain}.outseta.com/api/v1`;
  const authorization = `Outseta ${credentials.apiKey}:${credentials.secretKey}`;
  const rateLimit = options.rateLimit === undefined ? OUTSETA_RATE_LIMIT : options.rateLimit;
  const pacer = rateLimit ? createPacer(rateLimit) : undefined;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    { signal }: RequestOptions = {},
    retried = false,
  ): Promise<T> {
    await pacer?.wait(signal);
    const response = await doFetch(baseUrl + path, {
      method,
      signal,
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 401 || response.status === 403) throw new AuthError();
    if (response.status === 429) {
      if (retried) throw new RateLimitError();
      const delay = retryAfterMs(response.headers.get("Retry-After")) ?? retryDelayMs;
      if (pacer) pacer.pause(delay);
      else await sleep(delay, signal);
      return request<T>(method, path, body, { signal }, true);
    }
    if (!response.ok) {
      throw new OutsetaError(
        `Outseta returned ${response.status} for ${method} ${path.split("?")[0]}`,
        response.status,
      );
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  async function list<T>(path: string, params: ListParams, requestOptions?: RequestOptions): Promise<Page<T>> {
    const pageSize = params.pageSize ?? 25;
    const search = new URLSearchParams({ limit: String(pageSize), offset: String(params.page ?? 0) });
    if (params.query) search.set("q", params.query);
    if (params.fields) search.set("fields", params.fields);
    if (params.orderBy) search.set("orderBy", params.orderBy);
    for (const [key, value] of Object.entries(params.filters ?? {})) search.set(key, value);

    const result = await request<{ items?: T[]; metadata?: { total?: number; limit?: number; offset?: number } }>(
      "GET",
      `${path}?${search}`,
      undefined,
      requestOptions,
    );
    const items = result.items ?? [];
    const total = result.metadata?.total ?? items.length;
    // offset is a page index, not a record offset
    const appliedLimit = result.metadata?.limit ?? pageSize;
    const page = result.metadata?.offset ?? params.page ?? 0;
    return { items, total, hasMore: (page + 1) * appliedLimit < total };
  }

  async function guard(description: string, caseUid: string) {
    await options.guardWrite?.(description, caseUid);
  }

  return {
    searchPeople: (params: SearchParams, requestOptions?: RequestOptions) =>
      list<Person>("/crm/people", { ...params, fields: PERSON_LIST_FIELDS, pageSize: 100 }, requestOptions),
    searchAccounts: (params: SearchParams, requestOptions?: RequestOptions) =>
      list<Account>("/crm/accounts", { ...params, fields: ACCOUNT_LIST_FIELDS, pageSize: 100 }, requestOptions),
    searchCases: ({ filter, ...params }: SearchParams & { filter?: CaseFilter }, requestOptions?: RequestOptions) =>
      list<Case>(
        "/support/cases",
        {
          ...params,
          fields: CASE_LIST_FIELDS,
          orderBy: "LastActivity DESC",
          filters: caseFilterParams(filter ?? {}),
        },
        requestOptions,
      ),

    getPerson: (uid: string, requestOptions?: RequestOptions) =>
      request<Person>(
        "GET",
        `/crm/people/${encodeURIComponent(uid)}?fields=${PERSON_DETAIL_FIELDS}`,
        undefined,
        requestOptions,
      ),
    getAccount: (uid: string, requestOptions?: RequestOptions) =>
      request<Account>(
        "GET",
        `/crm/accounts/${encodeURIComponent(uid)}?fields=${ACCOUNT_DETAIL_FIELDS}`,
        undefined,
        requestOptions,
      ),
    getCase: (uid: string, requestOptions?: RequestOptions) =>
      request<Case>(
        "GET",
        `/support/cases/${encodeURIComponent(uid)}?fields=${CASE_DETAIL_FIELDS}`,
        undefined,
        requestOptions,
      ),

    /** Posts the plain text as a reply. Outseta emails it to the customer with agentName, or the company name, as the sender name. */
    async replyToCase(supportCase: Pick<Case, "Uid" | "Status">, text: string) {
      if (!canReply(supportCase)) {
        throw new ReplyError("Replies to spam cases are not emailed. Mark the case as not spam first.");
      }
      if (!text.trim()) throw new ReplyError("Write a reply first.");
      const agentName = options.agentName?.trim();
      await guard("reply to case", supportCase.Uid);
      await request<void>("POST", `/support/cases/${encodeURIComponent(supportCase.Uid)}/replies`, {
        Comment: plainTextToHtml(text),
        ...(agentName ? { AgentName: agentName } : {}),
      });
    },
  };
}

export type OutsetaClient = ReturnType<typeof createClient>;
