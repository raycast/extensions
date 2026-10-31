import { Cache, getPreferenceValues } from "@raycast/api";

// Talks to Jira Cloud with the user's email and API token. Nothing here logs requests or responses.

const TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;
const MAX_RETRY_WAIT_MS = 10_000;
// API tokens with scopes are only accepted through Atlassian's gateway, not on the site itself.
const GATEWAY = "https://api.atlassian.com";

// Remembers which route the token works on, so each launch goes straight to it.
const cache = new Cache();

/** Missing or unusable site, email or token. The list offers to open preferences. */
export class SetupError extends Error {}

export class JiraError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** Per-field messages Jira gives when it refuses a write. */
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

interface Config {
  origin: string;
  authorization: string;
}

/**
 * The site's origin, like https://your-team.atlassian.net. Always HTTPS, since the email and API token go with every
 * request: Jira Cloud has no plain-HTTP sites, so an http:// URL is upgraded and other schemes are refused.
 */
export function siteOrigin(): string | undefined {
  const siteUrl = getPreferenceValues<Preferences>().siteUrl?.trim();
  if (!siteUrl) return undefined;
  try {
    const url = new URL(siteUrl.includes("://") ? siteUrl : `https://${siteUrl}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.protocol = "https:";
    return url.origin;
  } catch {
    return undefined;
  }
}

function config(): Config {
  const { email, apiToken } = getPreferenceValues<Preferences>();
  const origin = siteOrigin();
  if (!origin || !email?.trim() || !apiToken?.trim()) {
    throw new SetupError("Add your Jira site, email and API token in the extension's preferences.");
  }
  return {
    origin,
    authorization: `Basic ${Buffer.from(`${email.trim()}:${apiToken.trim()}`).toString("base64")}`,
  };
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

/** A JQL string literal. */
export function jqlString(value: string): string {
  return `"${value.replace(/["\\]/g, "\\$&")}"`;
}

/**
 * My Issues' search. Test Connection runs it too, to tell an empty answer from a filter.
 * Names the account instead of using `currentUser()`, which doesn't always resolve for tokens with scopes.
 */
export function myIssuesJql(accountId: string): string {
  return `assignee = ${jqlString(accountId)} AND statusCategory != Done ORDER BY updated DESC`;
}

type Route = "site" | "gateway";

const SIGN_IN_FAILED =
  "Jira didn't accept your email or API token. Check them in preferences. A token with scopes needs the scopes listed in the README.";

/**
 * Jira answers some paths as a guest when the token is refused: 200, but with only what a guest can see,
 * so `currentUser()` matches nothing. The login header gives it away.
 */
function signInFailed(response: Response): boolean {
  const reason = response.headers.get("X-Seraph-LoginReason") ?? "";
  return response.status === 401 || /AUTHENTICATED_FAILED|AUTHENTICATION_DENIED/.test(reason);
}

function routeKey(origin: string, authorization: string): string {
  // Only a short fingerprint of the credentials, so a new token tries the site again first.
  let hash = 0;
  for (const char of authorization) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return `route:${origin}:${hash}`;
}

/** The site's cloud ID, which gateway URLs are built from. Jira gives it out without signing in. */
async function cloudId(origin: string): Promise<string> {
  const key = `cloud-id:${origin}`;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const response = await fetch(new URL("/_edge/tenant_info", origin), { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const { cloudId } = (await response.json()) as { cloudId?: string };
    if (!response.ok || !cloudId || !/^[a-z0-9-]+$/i.test(cloudId)) throw new Error();
    cache.set(key, cloudId);
    return cloudId;
  } catch {
    throw new JiraError(`Couldn't look up ${new URL(origin).host}'s cloud ID, which tokens with scopes need.`);
  }
}

async function routeUrl(route: Route, origin: string, path: string): Promise<URL> {
  const base = route === "site" ? origin : `${GATEWAY}/ex/jira/${await cloudId(origin)}`;
  const url = new URL(base + path);
  // Only paths under the site or its gateway, so the token never goes to a host a response pointed to.
  if (!path.startsWith("/") || url.origin !== new URL(base).origin || !url.href.startsWith(`${base}/`)) {
    throw new JiraError("Refused a request outside your Jira site");
  }
  return url;
}

/** Calls a Jira REST path, like "/rest/api/3/myself", and returns the parsed JSON. */
export async function jira<T>(path: string, { method = "GET", query, body }: RequestOptions = {}): Promise<T> {
  const { origin, authorization } = config();
  const key = routeKey(origin, authorization);
  const preferred: Route = cache.get(key) === "gateway" ? "gateway" : "site";

  let response: Response | undefined;
  // A refused sign-in means nothing was applied, so the other route can be tried even for writes.
  for (const route of [preferred, preferred === "site" ? "gateway" : "site"] as Route[]) {
    let url: URL;
    try {
      url = await routeUrl(route, origin, path);
    } catch (error) {
      // Without a cloud ID there's no gateway to try, so report the site's own answer.
      if (response) break;
      throw error;
    }
    for (const [name, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(name, String(value));
    }
    response = await send(url, origin, { method, authorization, body });
    if (!signInFailed(response)) {
      if (route !== preferred) cache.set(key, route);
      break;
    }
  }

  if (response && signInFailed(response)) throw new SetupError(SIGN_IN_FAILED);
  if (!response?.ok) throw await toError(response as Response);
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function send(
  url: URL,
  origin: string,
  { method, authorization, body }: { method: string; authorization: string; body?: unknown },
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: authorization,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new JiraError("Jira didn't answer in time. Check your connection.");
      }
      throw new JiraError(`Couldn't reach ${new URL(origin).host}. Check your connection and the site in preferences.`);
    }

    // Writes aren't retried after a server error, since Jira may have applied them.
    const retry = response.status === 429 || (response.status >= 500 && method === "GET");
    if (retry && attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
      continue;
    }
    return response;
  }
}

/** Honours Retry-After, within limits, and backs off otherwise. */
function retryDelay(response: Response, attempt: number): number {
  const seconds = Number(response.headers.get("Retry-After"));
  const wait = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000 * 2 ** attempt;
  return Math.min(wait, MAX_RETRY_WAIT_MS);
}

async function toError(response: Response): Promise<Error> {
  let messages: string[] = [];
  let fields: Record<string, string> = {};
  try {
    const body = (await response.json()) as { errorMessages?: string[]; errors?: Record<string, string> };
    messages = body.errorMessages ?? [];
    fields = body.errors ?? {};
  } catch {
    // Not JSON, like an HTML error page.
  }
  const detail = messages[0] ?? Object.values(fields)[0];

  switch (response.status) {
    case 401:
      return new SetupError(SIGN_IN_FAILED);
    case 403:
      return new JiraError(detail ?? "Your Jira account doesn't have permission for this.", 403, fields);
    case 404:
      return new JiraError(detail ?? "Jira couldn't find it, or your account can't see it.", 404, fields);
    case 429:
      return new JiraError("Jira is limiting requests right now. Try again in a minute.", 429, fields);
    default:
      return new JiraError(detail ?? `Jira answered with an error (${response.status}).`, response.status, fields);
  }
}

// Pages fetched at once after the first. Enough to be quick without tripping Jira's rate limits.
const PARALLEL_PAGES = 4;

type AgilePage<T> = { isLast?: boolean; total?: number } & Partial<Record<"values" | "issues", T[]>>;

/**
 * Reads an Agile API list from `startAt`, up to `limit` items. The first page says how many there are,
 * so the rest are fetched a few at a time instead of one after another.
 * `next` is where to continue when `limit` stopped it short.
 */
export async function agilePages<T>(
  path: string,
  key: "values" | "issues",
  limit: number,
  query: Record<string, string | number | undefined> = {},
  startAt = 0,
): Promise<{ items: T[]; complete: boolean; next?: number }> {
  const fetchPage = (at: number) =>
    jira<AgilePage<T>>(path, { query: { ...query, startAt: at, maxResults: 50 } }).then((page) => ({
      page,
      values: page[key] ?? [],
    }));

  const items: T[] = [];
  let { page, values } = await fetchPage(startAt);
  items.push(...values);
  // Jira may send fewer than asked for, so the first page sets the step.
  const step = values.length;

  if (page.total !== undefined && step > 0) {
    const end = Math.min(page.total, startAt + limit);
    const starts: number[] = [];
    for (let at = startAt + step; at < end; at += step) starts.push(at);
    for (let index = 0; index < starts.length; index += PARALLEL_PAGES) {
      const pages = await Promise.all(starts.slice(index, index + PARALLEL_PAGES).map(fetchPage));
      for (const entry of pages) items.push(...entry.values);
      if (pages.some((entry) => entry.values.length === 0)) break;
    }
    const reached = startAt + items.length;
    return reached >= page.total
      ? { items, complete: true }
      : { items: items.slice(0, limit), complete: false, next: startAt + Math.min(items.length, limit) };
  }

  // Lists without a total, read one page after another.
  for (;;) {
    const done = page.isLast ?? values.length === 0;
    if (done) return { items, complete: true };
    if (items.length >= limit) {
      return { items: items.slice(0, limit), complete: false, next: startAt + limit };
    }
    ({ page, values } = await fetchPage(startAt + items.length));
    items.push(...values);
  }
}
