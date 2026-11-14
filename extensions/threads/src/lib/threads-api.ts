/**
 * Minimal Threads Graph API client for the commands that need a real access token
 * (Analytics, Menu Bar Analytics, Giveaway). Modelled on the client in
 * `threads-analytics`, trimmed to the read-only calls this extension makes.
 *
 * Must not import `@raycast/api` — directly or transitively — so it stays loadable
 * under vitest. Raycast-side concerns (preferences, toasts) live in `threads-auth.ts`.
 */
import { THREADS_GRAPH_URL } from "./constants";

// Cap each request so a stalled connection can't leave a command spinning forever.
const REQUEST_TIMEOUT_MS = 20_000;

// The Threads API refuses user insights with a `since` before this date (2024-04-13).
const INSIGHTS_EARLIEST_UNIX = 1712991600;

// 100 pages × 100 replies ≈ 10k replies. Past that the list is reported as truncated and
// the giveaway refuses to draw, rather than spinning on the rate limit.
const REPLY_PAGE_LIMIT = 100;

/**
 * Pages of 100 posts each. A hard cap matters because reposts are dropped after the
 * fact: an account that mostly reposts would otherwise walk its entire history
 * looking for enough original posts, on every background refresh.
 */
const POST_PAGE_LIMIT = 25;

/** Keeps a non-JSON error body (an HTML gateway page) out of a toast at full length. */
const ERROR_BODY_MAX_CHARS = 300;

export type ThreadsMediaType = "TEXT" | "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "AUDIO" | "REPOST_FACADE";

export interface ThreadsProfile {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  biography?: string;
}

export interface ThreadsPost {
  id: string;
  text: string;
  timestamp: string;
  mediaType: ThreadsMediaType;
  permalink: string;
}

/** Raw per-post metrics, exactly as `/{id}/insights` reports them. */
export interface PostInsights {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
}

export const POST_INSIGHT_METRICS: ReadonlyArray<keyof PostInsights> = [
  "views",
  "likes",
  "replies",
  "reposts",
  "quotes",
  "shares",
];

export interface DailyValue {
  /** ISO timestamp the API reports as `end_time` for that day's bucket. */
  endTime: string;
  value: number;
}

/** Raw account-level metrics for a period, plus the current follower count. */
export interface AccountInsights {
  followersCount: number | null;
  views: number;
  viewsByDay: DailyValue[];
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}

export interface ThreadsReply {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  permalink: string;
}

/** Meta error code 190: the token expired, was revoked, or was invalidated. */
export class TokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenExpiredError";
  }
}

/**
 * The app or user hit a Threads rate limit. Distinct from an ordinary failure
 * because it applies to every other call too: the caller should stop rather than
 * spend the rest of the quota discovering the same thing 24 more times.
 */
export class RateLimitedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitedError";
  }
}

/**
 * The token was minted without a scope this endpoint needs. `scope` names it when
 * the endpoint identifies it, so the toast can say which one to add.
 */
export class MissingPermissionError extends Error {
  readonly path: string;
  readonly scope?: string;

  constructor(message: string, options: { path: string; scope?: string }) {
    super(message);
    this.name = "MissingPermissionError";
    this.path = options.path;
    this.scope = options.scope;
  }
}

/** Any other non-2xx answer, carrying what the API said so it can be copied into a bug report. */
export class ThreadsApiError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly path: string;
  /** Meta says a retry may succeed: a hiccup on its side, not a verdict on this item. */
  readonly transient: boolean;

  constructor(message: string, options: { status: number; code?: number; path: string; transient?: boolean }) {
    super(message);
    this.name = "ThreadsApiError";
    this.status = options.status;
    this.code = options.code;
    this.path = options.path;
    this.transient = options.transient ?? false;
  }
}

/** App-, user-, page-, and custom-level throttling. */
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);

/**
 * "Service temporarily unavailable". Meta flags it `is_transient`, but not reliably, and
 * often sends it with HTTP 400 — so the status alone would read it as a per-item refusal.
 *
 * Code 1, "An unknown error occurred", is deliberately not here: it also comes back
 * every time for some individual objects, and treating that as transient let one such
 * post fail the whole list on every launch. It counts as transient only when the body
 * says `is_transient`.
 */
const TRANSIENT_CODES = new Set([2]);

interface ApiErrorBody {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number; is_transient?: boolean };
}

function parseErrorBody(body: string): ApiErrorBody["error"] | undefined {
  try {
    return (JSON.parse(body) as ApiErrorBody)?.error;
  } catch {
    return undefined;
  }
}

/** The scope an endpoint needs, so a permission error can name it. */
function scopeForPath(path: string): string | undefined {
  if (path.includes("/conversation") || path.includes("/replies")) return "threads_read_replies";
  if (path.includes("insights")) return "threads_manage_insights";
  return undefined;
}

/**
 * Classifies an error response. The three specific classes exist because each has a
 * different fix — paste a new token, wait, re-mint with another scope — and a caller
 * that can degrade past an ordinary failure must still stop for these.
 */
function throwApiError(path: string, status: number, body: string): never {
  const error = parseErrorBody(body);
  const code = error?.code;
  // A non-JSON body (an HTML gateway page, say) is the only diagnostic there is;
  // reporting a bare status instead throws away what the API actually said.
  const message =
    error?.message ??
    (body.trim() ? body.trim().slice(0, ERROR_BODY_MAX_CHARS) : `Threads API responded with ${status}`);

  if (code === 190) throw new TokenExpiredError(message);
  if (status === 429 || (code !== undefined && RATE_LIMIT_CODES.has(code))) throw new RateLimitedError(message);
  // Code 10 and the 200-299 family are Meta's permission errors. The message match
  // catches a body that names the scope without a code we recognise.
  if (code === 10 || (code !== undefined && code >= 200 && code < 300) || /threads_[a-z_]+ permission/.test(message)) {
    throw new MissingPermissionError(message, { path, scope: scopeForPath(path) });
  }
  const transient = error?.is_transient === true || (code !== undefined && TRANSIENT_CODES.has(code));
  throw new ThreadsApiError(message, { status, code, path, transient });
}

/**
 * True only for a refusal confined to one item: an unclassified, non-transient 4xx.
 * Everything else — the three classes above, a transient error, a 5xx, a timeout, a
 * network failure, an unparseable body — would hit every other call too.
 *
 * An allowlist on purpose. Rethrowing only the known systemic classes let an offline
 * run through as twenty-five posts that "have no insights", which `useCachedPromise`
 * then stored as a successful result.
 */
function isRefusal(error: unknown): error is ThreadsApiError {
  return error instanceof ThreadsApiError && !error.transient && error.status >= 400 && error.status < 500;
}

/**
 * Degrades a per-item refusal to `null` and rethrows anything else, so one section
 * can fail without discarding the sections that loaded. `onRefused` lets a Raycast-side
 * caller log what was swallowed, since this module can't.
 */
export async function nullIfRefused<T>(
  promise: Promise<T>,
  onRefused?: (error: ThreadsApiError) => void,
): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (!isRefusal(error)) throw error;
    onRefused?.(error);
    return null;
  }
}

async function apiGet<T>(path: string, params: Record<string, string>, accessToken: string): Promise<T> {
  const url = new URL(`${THREADS_GRAPH_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) throwApiError(path, response.status, await response.text());

  return (await response.json()) as T;
}

export async function getProfile(accessToken: string): Promise<ThreadsProfile> {
  const data = await apiGet<{
    id: string;
    username: string;
    name?: string;
    threads_profile_picture_url?: string;
    threads_biography?: string;
  }>("/me", { fields: "id,username,name,threads_profile_picture_url,threads_biography" }, accessToken);

  return {
    id: data.id,
    username: data.username,
    name: data.name,
    profilePictureUrl: data.threads_profile_picture_url,
    biography: data.threads_biography,
  };
}

interface Paging {
  cursors?: { after?: string };
  next?: string;
}

/** Only follow `after` when `next` is also present; the cursor alone can be a dead end. */
function nextCursor(paging?: Paging): string | undefined {
  return paging?.next ? paging.cursors?.after : undefined;
}

/**
 * Whether `cursor` was already followed. A repeated cursor re-fetches the same page
 * until the page cap, spending the rate limit and duplicating every item on it, so
 * the caller stops and reports the list as incomplete — more may exist, unreachable.
 */
function isRepeatedCursor(cursor: string, seen: Set<string>): boolean {
  if (seen.has(cursor)) return true;
  seen.add(cursor);
  return false;
}

interface PostsResponse {
  data?: Array<{
    id: string;
    text?: string;
    timestamp?: string;
    media_type?: ThreadsMediaType;
    permalink?: string;
  }>;
  paging?: Paging;
}

export interface GetPostsOptions {
  /** Hard cap on posts returned, so a busy account can't trigger hundreds of insight calls. */
  maxPosts: number;
}

/**
 * The user's own posts, newest first. Reposts of other accounts (`REPOST_FACADE`)
 * are dropped: they carry no insights and cannot be drawn on.
 *
 * Pages are always requested at the API maximum rather than at "however many posts
 * are still missing". Reposts are filtered after the response arrives, so a page
 * sized to the shortfall can come back entirely reposts and make no progress — an
 * account that mostly reposts then pages through its whole history five items at a
 * time, on every background refresh.
 *
 * There is deliberately no date cutoff: every caller wants the newest N, and Analytics
 * filters by period client-side so a period switch doesn't cost a refetch.
 */
export async function getPosts(
  accessToken: string,
  options: GetPostsOptions,
): Promise<{ posts: ThreadsPost[]; truncated: boolean }> {
  const collected: ThreadsPost[] = [];
  const seenCursors = new Set<string>();
  let after: string | undefined;
  let truncated = false;

  for (let page = 0; page < POST_PAGE_LIMIT; page++) {
    const params: Record<string, string> = {
      fields: "id,text,timestamp,media_type,permalink",
      limit: "100",
    };
    if (after) params.after = after;

    const data = await apiGet<PostsResponse>("/me/threads", params, accessToken);
    const items = data.data ?? [];

    for (const raw of items) {
      if (!raw.timestamp || raw.media_type === "REPOST_FACADE") continue;
      collected.push({
        id: raw.id,
        text: raw.text ?? "",
        timestamp: raw.timestamp,
        mediaType: raw.media_type ?? "TEXT",
        permalink: raw.permalink ?? "",
      });
    }

    after = nextCursor(data.paging);

    // Out of history: nothing was left unseen, so anything dropped below was dropped by
    // the cap and only then is it a truncation.
    if (!after || items.length === 0) break;

    if (collected.length >= options.maxPosts || isRepeatedCursor(after, seenCursors)) {
      truncated = true;
      break;
    }

    // Ran out of pages before running out of history.
    if (page === POST_PAGE_LIMIT - 1) truncated = true;
  }

  return {
    posts: collected.slice(0, options.maxPosts),
    truncated: truncated || collected.length > options.maxPosts,
  };
}

interface InsightsResponse {
  data?: Array<{
    name: string;
    period?: string;
    values?: Array<{ value?: number; end_time?: string }>;
    total_value?: { value?: number };
  }>;
}

function metricValue(data: InsightsResponse, name: string): number {
  const metric = (data.data ?? []).find((item) => item.name === name);
  if (!metric) return 0;
  if (metric.total_value !== undefined) return metric.total_value.value ?? 0;
  return (metric.values ?? []).reduce((sum, entry) => sum + (entry.value ?? 0), 0);
}

/**
 * Per-post metrics, or `null` when the API refuses insights for this one post — a
 * quote of a deleted post, or one older than insights support — so a single bad post
 * can't blank the whole list.
 *
 * Anything that isn't a refusal is rethrown. Swallowing a rate limit made a throttled
 * run look like a hundred posts that happen to have no insights, and `useCachedPromise`
 * then stored that as a successful result.
 */
export async function getPostInsights(accessToken: string, postId: string): Promise<PostInsights | null> {
  return nullIfRefused(
    apiGet<InsightsResponse>(`/${postId}/insights`, { metric: POST_INSIGHT_METRICS.join(",") }, accessToken).then(
      (data) => ({
        views: metricValue(data, "views"),
        likes: metricValue(data, "likes"),
        replies: metricValue(data, "replies"),
        reposts: metricValue(data, "reposts"),
        quotes: metricValue(data, "quotes"),
        shares: metricValue(data, "shares"),
      }),
    ),
  );
}

/**
 * A point-in-time total the API refuses a date range for, so it can't ride along with
 * the period metrics. Degrades to `null` rather than failing the whole load — the
 * source project does the same, and an account below the API's reporting threshold
 * shouldn't lose its post list over it.
 */
async function getFollowersCount(accessToken: string): Promise<number | null> {
  const data = await nullIfRefused(
    apiGet<InsightsResponse>("/me/threads_insights", { metric: "followers_count" }, accessToken),
  );
  const metric = (data?.data ?? []).find((item) => item.name === "followers_count");
  return metric?.total_value?.value ?? null;
}

/** Account-level metrics between `since` and `until`. */
export async function getAccountInsights(accessToken: string, since: Date, until: Date): Promise<AccountInsights> {
  const sinceUnix = Math.max(INSIGHTS_EARLIEST_UNIX, Math.floor(since.getTime() / 1000));
  const untilUnix = Math.floor(until.getTime() / 1000);

  const [period, followersCount] = await Promise.all([
    apiGet<InsightsResponse>(
      "/me/threads_insights",
      {
        metric: "views,likes,replies,reposts,quotes",
        period: "day",
        since: String(sinceUnix),
        until: String(untilUnix),
      },
      accessToken,
    ),
    getFollowersCount(accessToken),
  ]);

  const viewsMetric = (period.data ?? []).find((item) => item.name === "views");
  const viewsByDay: DailyValue[] = (viewsMetric?.values ?? [])
    .filter((entry): entry is { value?: number; end_time: string } => Boolean(entry.end_time))
    .map((entry) => ({ endTime: entry.end_time, value: entry.value ?? 0 }));

  return {
    followersCount,
    views: metricValue(period, "views"),
    viewsByDay,
    likes: metricValue(period, "likes"),
    replies: metricValue(period, "replies"),
    reposts: metricValue(period, "reposts"),
    quotes: metricValue(period, "quotes"),
  };
}

/**
 * Replies the host has kept out of sight. `/conversation` still returns them to the
 * post's owner — Meta's own example response includes a `HIDDEN` one — so a giveaway
 * that read them as entries would let a hidden spam account win.
 */
const HIDDEN_REPLY_STATUSES = new Set(["HIDDEN", "COVERED", "BLOCKED", "RESTRICTED"]);

interface ConversationResponse {
  data?: Array<{
    id: string;
    username?: string;
    text?: string;
    timestamp?: string;
    permalink?: string;
    hide_status?: string;
  }>;
  paging?: Paging;
}

export interface RepliesResult {
  replies: ThreadsReply[];
  /** True when paging stopped early — the cap, or a repeated cursor — so replies may be missing. */
  truncated: boolean;
  /**
   * Replies the API returned without a username — how it represents a private
   * profile. They can't be credited to an entrant, so they're dropped; the count is
   * reported because a giveaway host needs to know entrants were excluded.
   */
  dropped: number;
  /** Replies the host hid, or from accounts they blocked or restricted; also excluded. */
  hidden: number;
}

/** Every reply, at every nesting depth, under one of the user's own posts. */
export async function getReplies(accessToken: string, postId: string): Promise<RepliesResult> {
  const replies: ThreadsReply[] = [];
  // Overlapping pages must not hand one reply a second chance in the draw.
  const seenIds = new Set<string>();
  const seenCursors = new Set<string>();
  let dropped = 0;
  let hidden = 0;
  let after: string | undefined;

  for (let page = 0; page < REPLY_PAGE_LIMIT; page++) {
    const params: Record<string, string> = {
      fields: "id,username,text,timestamp,permalink,hide_status",
      limit: "100",
    };
    if (after) params.after = after;

    const data = await apiGet<ConversationResponse>(`/${postId}/conversation`, params, accessToken);

    for (const raw of data.data ?? []) {
      if (seenIds.has(raw.id)) continue;
      seenIds.add(raw.id);
      if (raw.hide_status && HIDDEN_REPLY_STATUSES.has(raw.hide_status)) {
        hidden++;
        continue;
      }
      if (!raw.username || !raw.timestamp) {
        dropped++;
        continue;
      }
      replies.push({
        id: raw.id,
        username: raw.username,
        text: raw.text ?? "",
        timestamp: raw.timestamp,
        permalink: raw.permalink ?? "",
      });
    }

    after = nextCursor(data.paging);
    if (!after) return { replies, truncated: false, dropped, hidden };
    if (isRepeatedCursor(after, seenCursors)) break;
  }

  return { replies, truncated: true, dropped, hidden };
}

/**
 * Runs `fn` over `items` with at most `limit` in flight, preserving order.
 *
 * A rejection stops the remaining items. The failures that reach here are systemic —
 * a rate limit, an expired token — so continuing would only spend the rest of the
 * quota rediscovering the same error once per item.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let stopped = false;

  const worker = async () => {
    while (!stopped && next < items.length) {
      const index = next++;
      try {
        results[index] = await fn(items[index]);
      } catch (error) {
        stopped = true;
        throw error;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
