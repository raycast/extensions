import { getPreferenceValues } from "@raycast/api";
import type { PrActivityFieldsFragment } from "./generated/graphql";
import { PR_ACTIVITY_BY_NUMBER_QUERY, PR_METADATA_QUERY } from "./api/pr-activity-query";
import { adaptPullRequest, type TruncationReport } from "./graphql-adapter";
import type { PRWithActivity, SeenMap, SeenState } from "./types";
import { prKey } from "./types";
import type { EventFilters } from "./event-filters";
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
  // remains unread. Only the new, full-PR watermark has the required semantics.
  if (!seen?.fullySeenAt) return true;
  const updatedAtMs = Date.parse(updatedAt);
  const fullySeenAtMs = Date.parse(seen.fullySeenAt);
  if (!Number.isFinite(updatedAtMs) || !Number.isFinite(fullySeenAtMs)) return true;
  return updatedAtMs > fullySeenAtMs - UPDATED_AT_SAFETY_MARGIN_MS;
}

async function fetchMetadataForRepo(
  endpoint: string,
  token: string,
  repo: string,
  maxScan: number,
): Promise<{ prs: MetadataPR[]; cost: number; complete: boolean }> {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    log.warn("Skipping malformed repository entry", { repo });
    return { prs: [], cost: 0, complete: false };
  }

  const prs: MetadataPR[] = [];
  let cost = 0;
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage && prs.length < maxScan) {
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

  return { prs, cost, complete: !hasNextPage };
}

export interface GraphQLFetchOptions {
  seen: SeenMap;
  filters: EventFilters;
  maxUnread: number;
  maxScan: number;
}

export interface GraphQLFetchResult {
  prs: PRWithActivity[];
  activeKeys: string[];
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
  const metadata: { prs: MetadataPR[]; cost: number; complete: boolean }[] = [];
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
      const unseen = getUnseenActivity(adapted.pr, opts.seen[prKey(adapted.pr)]).filter(
        (item) => opts.filters[item.type],
      );
      if (unseen.length > 0) {
        // Preserve the existing output contract: only unread PRs are retained in memory/cache.
        prs.push(adapted.pr);
        truncations.push(...adapted.truncations);
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

  // Pages are cursor-paginated over an `UPDATED_AT`-ordered connection, and that ordering is
  // MUTABLE: a PR updated between page requests can move ahead of the saved cursor and be
  // skipped, or appear on two pages. Either way `activeKeys` is no longer the complete open set,
  // and pruning seen state against it deletes read history for PRs that are still open.
  //
  // A duplicate is the observable symptom of that reordering, so treat it as proof the snapshot
  // shifted underneath us and refuse to authorize pruning. (A skipped PR is undetectable from
  // this side, which is why pruning stays conservative rather than clever.)
  const scannedKeys = scannedMetadata.map((pr) => prKey(pr));
  const uniqueKeys = new Set(scannedKeys);
  const sawReorder = uniqueKeys.size !== scannedKeys.length;
  if (sawReorder) {
    log.warn("PR list reordered mid-scan — not pruning seen state this refresh", {
      fetched: scannedKeys.length,
      unique: uniqueKeys.size,
    });
  }

  const scanComplete =
    metadata.every((result) => result.complete) &&
    scannedMetadata.length === metadata.reduce((sum, result) => sum + result.prs.length, 0) &&
    !activityMissingAfterMetadata &&
    !sawReorder;
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
    truncations,
    cost,
    scanComplete,
    watermarks,
  };
}
