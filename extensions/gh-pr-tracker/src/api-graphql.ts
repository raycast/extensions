import { getPreferenceValues } from "@raycast/api";
import type { PrActivityFieldsFragment } from "./generated/graphql";
import { PR_ACTIVITY_BY_NUMBER_QUERY, PR_METADATA_QUERY } from "./api/pr-activity-query";
import { adaptPullRequest, type TruncationReport } from "./graphql-adapter";
import type { PRWithActivity, SeenMap, SeenState } from "./types";
import { prKey } from "./types";
import type { EventFilters } from "./event-filters";
import { matchesPrFilter, type CompiledPrFilter } from "./pr-filter-query";
import { getUnseenActivity } from "./utils";
import { apiLog as log, safeUrl } from "./logger";

/** GitHub caps a connection page at 100 regardless of what callers request. */
const MAX_PAGE_SIZE = 100;

/** Metadata is intentionally cheap, so use GitHub's largest legal connection page. */
const METADATA_PAGE_SIZE = 100;
const METADATA_CONCURRENCY = 4;

/**
 * A standalone inline review comment can precede PullRequest.updatedAt by 6–10 seconds. The
 * measured 60-second margin prevents that eventual-consistency window from hiding unread work.
 */
const UPDATED_AT_SAFETY_MARGIN_MS = 60_000;

/**
 * Parallelism for the per-PR activity pass.
 *
 * MEASURED against raycast/extensions, 8 PRs, identical rate-limit cost (8 points) at every level:
 *   concurrency 2 → 2464ms
 *   concurrency 4 → 1286ms
 *   concurrency 8 →  892ms
 *
 * Concurrency is free in quota terms and only affects wall-clock, so 2 was needlessly slow: it
 * made a first run (nothing marked seen, so every scanned PR needs detail) SLOWER than the old
 * page-based fetch — ~44s vs ~28s at 150 PRs. 6 keeps a first run comfortably ahead while
 * staying well short of GitHub's secondary rate limits, which target sustained bursts.
 */
const ACTIVITY_CONCURRENCY = 6;

/** Three total attempts gives a transient gateway timeout two chances to recover. */
const MAX_REQUEST_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string; type?: string; path?: (string | number)[] }[];
}

interface RateLimit {
  cost: number;
  remaining: number;
  nodeCount: number;
}

interface MetadataConnection {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: ({ number: number; updatedAt: string } | null)[];
}

interface MetadataQuery {
  rateLimit: RateLimit | null;
  repository: { pullRequests: MetadataConnection } | null;
}

interface ActivityByNumberQuery {
  rateLimit: RateLimit | null;
  repository: { pullRequest: PrActivityFieldsFragment | null } | null;
}

interface MetadataPR {
  repo: string;
  owner: string;
  name: string;
  number: number;
  updatedAt: string;
}

function getConfig() {
  const prefs = getPreferenceValues<Preferences>();
  const host = (prefs.ghHost || "").trim() || "github.com";
  const isGitHubDotCom = host === "github.com" || host === "api.github.com";
  // GHES exposes GraphQL at /api/graphql — NOT /api/v3/graphql, which is the REST prefix.
  const endpoint = isGitHubDotCom ? "https://api.github.com/graphql" : `https://${host}/api/graphql`;
  const repos = prefs.repos
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return { endpoint, token: prefs.token, repos };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Full-jitter exponential backoff: 0–1s, then 0–2s before the second and third attempts. */
function retryDelayMs(completedAttempts: number): number {
  return Math.floor(Math.random() * 1000 * 2 ** (completedAttempts - 1));
}

/**
 * Execute one GraphQL request. A retry happens at the exact cursor/PR number supplied by the
 * caller, so a failed later page resumes in place instead of restarting the completed scan.
 *
 * GitHub can return partial data with GraphQL errors under resource limits. That response is never
 * usable here: caching it as truth would hide real unread activity, so it falls back to REST.
 */
async function execute<T>(
  endpoint: string,
  token: string,
  query: string,
  variables: Record<string, string | number | null>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "gh-pr-tracker",
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (error) {
      if (attempt === MAX_REQUEST_ATTEMPTS) throw error;
      const delayMs = retryDelayMs(attempt);
      log.warn("GraphQL network request failed — retrying", { attempt, delayMs, url: safeUrl(endpoint) });
      await sleep(delayMs);
      continue;
    }

    if (!res.ok) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      const retryable = RETRYABLE_STATUS.has(res.status);
      log[retryable && attempt < MAX_REQUEST_ATTEMPTS ? "warn" : "error"]("GraphQL request failed", {
        status: res.status,
        statusText: res.statusText,
        url: safeUrl(endpoint),
        rateLimitRemaining: remaining,
        attempt,
        retrying: retryable && attempt < MAX_REQUEST_ATTEMPTS,
      });
      if (retryable && attempt < MAX_REQUEST_ATTEMPTS) {
        const delayMs = retryDelayMs(attempt);
        await sleep(delayMs);
        continue;
      }
      if ((res.status === 403 || res.status === 429) && remaining === "0") {
        const resetAt = Number(res.headers.get("x-ratelimit-reset"));
        const minutes = Number.isFinite(resetAt) ? Math.max(1, Math.ceil((resetAt * 1000 - Date.now()) / 60000)) : null;
        throw new Error(
          `GitHub API rate limit exceeded. Your token's hourly quota is used up${
            minutes ? ` — it resets in about ${minutes} minute${minutes === 1 ? "" : "s"}` : ""
          }.`,
        );
      }
      throw new Error(`GitHub GraphQL error: ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as GraphQLResponse<T>;
    if (body.errors?.length) {
      log.warn("GraphQL returned errors — treating as failure", {
        count: body.errors.length,
        messages: body.errors.slice(0, 3).map((error) => error.message),
        hadPartialData: body.data != null,
      });
      throw new Error(body.errors[0].message);
    }
    if (!body.data) throw new Error("GitHub GraphQL returned no data");
    return body.data;
  }

  throw new Error("GraphQL request exhausted retries");
}

function couldContainUnreadActivity(updatedAt: string, seen: SeenState | undefined): boolean {
  // `lastSeen` is intentionally NOT used: a single-item action advances it while other activity
  // remains unread. Only the full-PR watermark has the required semantics.
  if (!seen?.fullySeenAt) return true;
  const updatedAtMs = Date.parse(updatedAt);
  const fullySeenAtMs = Date.parse(seen.fullySeenAt);
  if (!Number.isFinite(updatedAtMs) || !Number.isFinite(fullySeenAtMs)) return true;

  // Two kinds of watermark exist, and the safety margin applies to only one of them.
  //
  //  - `watermarkSource: "updated-at"` — derived from the PR's own `updated_at` by a fetch that
  //    found nothing unseen. It is on GitHub's clock, the SAME clock as `updatedAt`, so equality
  //    means "unchanged since we last looked" and there is no lag to absorb. Applying the margin
  //    here makes `W > W - 60s` trivially true, so the skip never fires — which is exactly the
  //    population the watermark exists to skip (observed: skippedByWatermark 0, 150/150 fetched).
  //
  //  - `watermarkSource: "wall-clock"` — written by markPRSeen / markAllSeen at `Date.now()`.
  //    A standalone inline review comment can precede `updatedAt` by 6–10s (measured, §3), so a
  //    PR marked read at that moment can have activity GitHub has not yet reflected. The margin
  //    widens the fetch window to cover it.
  const margin = seen.watermarkSource === "updated-at" ? 0 : UPDATED_AT_SAFETY_MARGIN_MS;
  return updatedAtMs > fullySeenAtMs - margin;
}

async function fetchMetadataForRepo(
  endpoint: string,
  token: string,
  repo: string,
  maxScan: number,
): Promise<{ prs: MetadataPR[]; cost: number; complete: boolean; paginated: boolean }> {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    log.warn("Skipping malformed repository entry", { repo });
    return { prs: [], cost: 0, complete: false, paginated: false };
  }

  const prs: MetadataPR[] = [];
  let cost = 0;
  let cursor: string | null = null;
  let hasNextPage = true;
  let pagesFetched = 0;

  while (hasNextPage && prs.length < maxScan) {
    pagesFetched++;
    const first = Math.min(METADATA_PAGE_SIZE, MAX_PAGE_SIZE, maxScan - prs.length);
    const data: MetadataQuery = await execute<MetadataQuery>(endpoint, token, PR_METADATA_QUERY, {
      owner,
      name,
      first,
      after: cursor,
    });
    cost += data.rateLimit?.cost ?? 0;
    const connection: MetadataConnection | undefined = data.repository?.pullRequests;
    if (!connection) throw new Error(`GitHub GraphQL did not return pull requests for ${repo}`);

    for (const node of connection.nodes) {
      if (node) prs.push({ repo, owner, name, number: node.number, updatedAt: node.updatedAt });
    }

    const nextCursor: string | null = connection.pageInfo.endCursor;
    if (connection.pageInfo.hasNextPage && (nextCursor === null || nextCursor === cursor)) {
      throw new Error(`GitHub GraphQL cursor stopped advancing for ${repo}`);
    }
    hasNextPage = connection.pageInfo.hasNextPage;
    cursor = nextCursor;
  }

  // `paginated` records whether a cursor was ever followed. A single-page scan has no
  // reordering window, so it is the only shape that can claim a complete key set.
  return { prs, cost, complete: !hasNextPage, paginated: pagesFetched > 1 };
}

export interface GraphQLFetchOptions {
  seen: SeenMap;
  filters: EventFilters;
  prFilter?: CompiledPrFilter;
  maxUnread: number;
  maxScan: number;
}

export interface GraphQLFetchResult {
  prs: PRWithActivity[];
  activeKeys: string[];
  /**
   * Every PR whose GraphQL activity was incomplete, including PRs whose fetched newest page had
   * no unread items. Callers must REST-backfill these before deciding whether they are unread:
   * an older unread item may be outside the fixed-size GraphQL page.
   */
  truncatedPrs: PRWithActivity[];
  truncations: TruncationReport[];
  /** Total successful-query rate-limit points spent, for logging/comparison against the REST path. */
  cost: number;
  /** True only when metadata walked every open PR and therefore contains a complete key set. */
  scanComplete: boolean;
  /**
   * PRs proven fully-seen by this fetch that had no `fullySeenAt` watermark yet. Callers persist
   * these so the next metadata pass can skip them — this is what makes the prefilter effective
   * for seen-state written before the watermark existed.
   */
  watermarks: { key: string; updatedAt: string }[];
}

/**
 * Fetch activity in two passes: a cheap, ordered metadata index first; full nested activity only
 * for PRs whose conservative full-PR watermark says they may have changed.
 */
export async function fetchPRsWithActivityGraphQL(opts: GraphQLFetchOptions): Promise<GraphQLFetchResult> {
  const { endpoint, token, repos } = getConfig();
  const startedAt = Date.now();
  const metadata: { prs: MetadataPR[]; cost: number; complete: boolean; paginated: boolean }[] = [];
  for (let index = 0; index < repos.length; index += METADATA_CONCURRENCY) {
    const batch = repos.slice(index, index + METADATA_CONCURRENCY);
    metadata.push(
      ...(await Promise.all(batch.map((repo) => fetchMetadataForRepo(endpoint, token, repo, opts.maxScan)))),
    );
  }
  let cost = metadata.reduce((sum, result) => sum + result.cost, 0);
  const watermarks: { key: string; updatedAt: string }[] = [];

  // Taking up to maxScan from every repo before merging is necessary: applying the shared cap in
  // repository order starves later repos. No omitted PR can be in the global newest maxScan set.
  const scannedMetadata = metadata
    .flatMap((result) => result.prs)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, opts.maxScan);
  const candidates = scannedMetadata.filter((pr) =>
    couldContainUnreadActivity(pr.updatedAt, opts.seen[`${pr.repo}#${pr.number}`]),
  );
  const prs: PRWithActivity[] = [];
  const truncatedPrs: PRWithActivity[] = [];
  const truncations: TruncationReport[] = [];
  let activityMissingAfterMetadata = false;

  for (let index = 0; index < candidates.length; index += ACTIVITY_CONCURRENCY) {
    const batch = candidates.slice(index, index + ACTIVITY_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (candidate) => {
        const data = await execute<ActivityByNumberQuery>(endpoint, token, PR_ACTIVITY_BY_NUMBER_QUERY, {
          owner: candidate.owner,
          name: candidate.name,
          number: candidate.number,
        });
        return { candidate, data };
      }),
    );
    for (const { candidate, data } of results) {
      cost += data.rateLimit?.cost ?? 0;
      const node = data.repository?.pullRequest;
      if (!node) {
        // A PR can close between metadata and detail requests. It is not safe to treat the key set
        // as complete in that case, but the next refresh will reconcile it.
        log.debug("PR disappeared between GraphQL metadata and activity requests", {
          repo: candidate.repo,
          pr: candidate.number,
        });
        activityMissingAfterMetadata = true;
        continue;
      }
      const adapted = adaptPullRequest(node, candidate.repo);
      if (adapted.truncations.length > 0) {
        // Hand every incomplete PR to api.ts for full REST pagination. This must happen before the
        // unread check: a fetched newest page can be entirely seen while an older omitted item is
        // still unread, so scoping backfill to `prs` would make that item undiscoverable forever.
        truncatedPrs.push(adapted.pr);
        truncations.push(...adapted.truncations);
      }
      const unseen = getUnseenActivity(adapted.pr, opts.seen[prKey(adapted.pr)]).filter(
        (item) => opts.filters[item.type],
      );
      if (unseen.length > 0 && (!opts.prFilter || matchesPrFilter(adapted.pr, opts.prFilter))) {
        // Preserve the existing output contract: only unread PRs are retained in memory/cache.
        prs.push(adapted.pr);
      } else if (adapted.truncations.length > 0) {
        // Looks fully-seen, but a connection came back TRUNCATED — so "no unseen items" describes
        // an INCOMPLETE activity list, not the PR. An older unseen item may have been paged out.
        //
        // Do NOT record a watermark from this: the metadata prefilter would then skip the PR on
        // future refreshes, hiding that activity permanently. The caller receives this PR through
        // `truncatedPrs` and fully pages it over REST before finalizing the unread list.
        log.debug("Truncated result looks fully-seen — withholding watermark", {
          pr: prKey(adapted.pr),
          connections: adapted.truncations.map((t) => t.connection),
        });
      } else {
        // Record a `fullySeenAt` watermark so the metadata pass can skip this PR on later
        // refreshes. Without it the prefilter never fires: seen-state written before the
        // watermark existed has none, so every scanned PR keeps paying for a full activity fetch
        // (observed: skippedByWatermark 0, 150/150 fetched, 152 rate-limit points).
        //
        // Evaluated WITHOUT the event filters. A watermark makes later refreshes skip this PR
        // entirely, so recording one because activity is merely *hidden* would make that activity
        // unreachable once the user re-enables the filter. The watermark must mean "nothing
        // unseen here", never "nothing visible right now".
        //
        // The timestamp is the PR's own updated_at, never `now`: `now` would claim we had seen
        // activity up to the present moment and would skip items that landed during this fetch.
        const key = prKey(adapted.pr);
        const entry = opts.seen[key];
        if (!entry?.fullySeenAt && getUnseenActivity(adapted.pr, entry).length === 0) {
          watermarks.push({ key, updatedAt: adapted.pr.updated_at });
        }
      }
    }
  }

  prs.sort((a, b) => {
    const aUnseen = getUnseenActivity(a, opts.seen[prKey(a)]).filter((item) => opts.filters[item.type])[0];
    const bUnseen = getUnseenActivity(b, opts.seen[prKey(b)]).filter((item) => opts.filters[item.type])[0];
    return Date.parse(bUnseen?.date ?? b.updated_at) - Date.parse(aUnseen?.date ?? a.updated_at);
  });

  // A MULTI-PAGE cursor scan can never prove it saw every open PR.
  //
  // Pages are cursor-paginated over an `UPDATED_AT`-ordered connection, and that ordering is
  // MUTABLE. A PR updated between page requests moves ahead of the saved cursor; page N+1 resumes
  // after that cursor and simply never contains it. No duplicate appears, nothing is observable
  // from this side, and the key set is silently short one still-open PR.
  //
  // An earlier version tried to detect this by looking for duplicates. Duplicates catch only the
  // *other* half of the reordering (a PR sliding backwards), not the skip — so `scanComplete`
  // could be true for a key set that was missing entries, and `saveSeen` then deleted the read
  // history of every open PR that fell through the gap.
  //
  // Since a skip is undetectable, completeness is only claimed when it is structurally guaranteed:
  // every repo finished in a SINGLE page, so no cursor was ever used and no reordering window
  // existed. Multi-page scans return the keys but never authorize pruning.
  const scannedKeys = scannedMetadata.map((pr) => prKey(pr));
  const anyRepoPaginated = metadata.some((result) => result.paginated);
  if (anyRepoPaginated) {
    log.debug("Multi-page metadata scan — not pruning seen state this refresh", {
      scanned: scannedKeys.length,
    });
  }

  const scanComplete =
    metadata.every((result) => result.complete) &&
    scannedMetadata.length === metadata.reduce((sum, result) => sum + result.prs.length, 0) &&
    !activityMissingAfterMetadata &&
    !anyRepoPaginated;
  log.info("GraphQL PR activity fetch complete", {
    metadataScanned: scannedMetadata.length,
    activityFetched: candidates.length,
    skippedByWatermark: scannedMetadata.length - candidates.length,
    collected: Math.min(prs.length, opts.maxUnread),
    cost,
    elapsedMs: Date.now() - startedAt,
    truncatedConnections: truncations.length,
    hitScanCap: scannedMetadata.length >= opts.maxScan,
  });

  return {
    prs: prs.slice(0, opts.maxUnread),
    activeKeys: scannedMetadata.map((pr) => `${pr.repo}#${pr.number}`),
    truncatedPrs,
    truncations,
    cost,
    scanComplete,
    watermarks,
  };
}
