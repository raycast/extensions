import { getPreferenceValues } from "@raycast/api";
import type {
  GHPullRequest,
  GHReview,
  GHReviewComment,
  GHIssueComment,
  GHIssueEvent,
  GHCommit,
  PRWithActivity,
  SeenMap,
} from "./types";
import { prKey } from "./types";
import type { EventFilters } from "./event-filters";
import { getUnseenActivity, MAX_UNREAD_PRS, MAX_SCAN_PRS } from "./utils";
import { apiLog as log, safeUrl, getErrorMessage } from "./logger";
import { fetchPRsWithActivityGraphQL } from "./api-graphql";
import { applyFullySeenWatermarks } from "./seen";
import { matchesPrFilter, type CompiledPrFilter } from "./pr-filter-query";

const CONCURRENCY = 5;

export function getConfig() {
  const prefs = getPreferenceValues<Preferences>();
  // Optional preference — default to github.com when unset/blank; only GitHub Enterprise needs a host.
  const host = (prefs.ghHost || "").trim() || "github.com";
  const isGitHubDotCom = host === "github.com" || host === "api.github.com";
  const base = isGitHubDotCom ? "https://api.github.com" : `https://${host}/api/v3`;
  const headers = {
    Authorization: `token ${prefs.token}`,
    Accept: "application/vnd.github.v3+json",
  };
  const repos = prefs.repos
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return { base, headers, repos };
}

/** Parse a numeric textfield preference, falling back to `fallback` and clamping to [1, 1000]. */
function parseLimit(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1000, Math.max(1, n));
}

/**
 * User-configurable fetch limits (extension preferences), used by both the fetch and the display
 * caps so the list, badge, and cache all agree on how many unread PRs to surface.
 */
export function getFetchLimits(): { maxUnread: number; maxScan: number } {
  const prefs = getPreferenceValues<Preferences>();
  return {
    maxUnread: parseLimit(prefs.maxUnreadPrs, MAX_UNREAD_PRS),
    maxScan: parseLimit(prefs.maxScanPrs, MAX_SCAN_PRS),
  };
}

/** Paginated GET — fetches all pages and concatenates results */
async function fetchAllPages<T>(url: string, headers: Record<string, string>): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  while (true) {
    const separator = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${separator}per_page=100&page=${page}`, {
      headers,
    });
    if (!res.ok) {
      // Rate-limit exhaustion is the failure most likely to bite on large repos — surface the
      // reset time rather than letting it read as a generic 403.
      const remaining = res.headers.get("x-ratelimit-remaining");
      log.error("GitHub API request failed", {
        status: res.status,
        statusText: res.statusText,
        url: safeUrl(url),
        rateLimitRemaining: remaining,
        rateLimitReset: res.headers.get("x-ratelimit-reset"),
      });
      // GitHub returns 403 (not 429) when the hourly quota is exhausted, so a bare status reads
      // like a token/permissions problem and sends users to check scopes. Detect it via the
      // remaining-count header and say what actually happened, including when it recovers.
      if ((res.status === 403 || res.status === 429) && remaining === "0") {
        const resetAt = Number(res.headers.get("x-ratelimit-reset"));
        const minutes = Number.isFinite(resetAt) ? Math.max(1, Math.ceil((resetAt * 1000 - Date.now()) / 60000)) : null;
        throw new Error(
          `GitHub API rate limit exceeded. Your token's hourly quota is used up${
            minutes ? ` — it resets in about ${minutes} minute${minutes === 1 ? "" : "s"}` : ""
          }. Lowering "Max Unread PRs" or "Max PRs to Scan" reduces how many requests each refresh costs.`,
        );
      }
      // Scrub here too: this message reaches a failure toast and the error log, so leaving the
      // raw URL in it would defeat safeUrl() on the line above.
      throw new Error(`GitHub API error: ${res.status} ${res.statusText} for ${safeUrl(url)}`);
    }
    const batch = (await res.json()) as T[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const item of batch) results.push(item);
    if (batch.length < 100) break;
    page++;
  }
  return results;
}

/** Fetch all reviews / comments / events / commits for a single PR, and refresh its full metadata. */
async function fetchActivity(
  base: string,
  headers: Record<string, string>,
  repo: string,
  pr: GHPullRequest,
): Promise<PRWithActivity> {
  const [fullPr, reviews, reviewComments, issueComments, events, commits] = await Promise.all([
    fetch(`${base}/repos/${repo}/pulls/${pr.number}`, { headers }).then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json() as Promise<GHPullRequest>;
    }),
    fetchAllPages<GHReview>(`${base}/repos/${repo}/pulls/${pr.number}/reviews`, headers),
    fetchAllPages<GHReviewComment>(`${base}/repos/${repo}/pulls/${pr.number}/comments`, headers),
    fetchAllPages<GHIssueComment>(`${base}/repos/${repo}/issues/${pr.number}/comments`, headers),
    fetchAllPages<GHIssueEvent>(`${base}/repos/${repo}/issues/${pr.number}/events`, headers),
    fetchAllPages<GHCommit>(`${base}/repos/${repo}/pulls/${pr.number}/commits`, headers),
  ]);
  return { ...fullPr, repo, reviews, reviewComments, issueComments, events, commits };
}

/**
 * Keep only the PR fields we actually consume. The open-PR list for a large repo can be hundreds
 * of entries; dropping the heaviest fields GitHub returns (body, diff stats, …) keeps the
 * in-memory index of open PRs small while we scan for unread activity. Assignees, requested
 * reviewers, labels, and draft status are kept — they're small, and saved PR filters match
 * against them (see pr-filter-query.ts).
 */
function slimPr(pr: GHPullRequest): GHPullRequest {
  return {
    number: pr.number,
    title: pr.title,
    html_url: pr.html_url,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    user: { login: pr.user.login, avatar_url: pr.user.avatar_url },
    comments: pr.comments,
    state: pr.state,
    assignees: pr.assignees.map((u) => ({ login: u.login, avatar_url: u.avatar_url })),
    requested_reviewers: pr.requested_reviewers.map((u) => ({ login: u.login, avatar_url: u.avatar_url })),
    labels: pr.labels,
    draft: pr.draft,
  };
}

export interface FetchOptions {
  /** Current seen state — used to skip PRs with no unread activity while backfilling. */
  seen: SeenMap;
  /** Active event filters — a PR whose only activity is filtered out doesn't count as unread. */
  filters: EventFilters;
  /**
   * The currently active saved PR filter, if any. Applied alongside `filters` at the exact point
   * a PR is judged unread-and-visible, so "Max Unread/Scan" budgets aren't spent on PRs the
   * filter excludes. Never applied to watermark eligibility — see the scan loop below.
   */
  prFilter?: CompiledPrFilter;
  /** Which command initiated this fetch. Logged so duplicate concurrent fetches are attributable. */
  source?: string;
  /** Target number of PRs with unread activity to return. Defaults to MAX_UNREAD_PRS. */
  maxUnread?: number;
  /** Safety ceiling on how many PRs we pull sub-resources for. Defaults to MAX_SCAN_PRS. */
  maxScan?: number;
}

export interface FetchResult {
  /** PRs that have unread activity, newest-active first, capped at maxUnread. */
  prs: PRWithActivity[];
  /** Keys of every open PR across all repos — used to prune seen state for closed PRs. */
  activeKeys: string[];
  /**
   * Whether `activeKeys` is the COMPLETE set of open PRs.
   *
   * Pruning seen state against a partial set deletes read history for still-open PRs that simply
   * weren't scanned — they then resurface as unread. The REST path always lists every open PR up
   * front so it can prune safely; a cursor-paginated GraphQL scan that stops early cannot.
   * Callers MUST NOT pass `activeKeys` to `saveSeen` when this is false.
   */
  activeKeysComplete: boolean;
}

/**
 * Fetch open PRs with activity across all configured repositories.
 *
 * On large repos (e.g. raycast/extensions) fetching full activity for every open PR is both slow
 * and memory-heavy enough to OOM. Instead we:
 *   1. List open PRs (cheap metadata only) and sort by most-recently-updated;
 *   2. Pull each PR's sub-resources in that order, keeping only PRs with unread activity and
 *      immediately dropping the rest, until we have `maxUnread` unread PRs or have scanned
 *      `maxScan` PRs.
 * Because seen / filtered PRs are discarded as we go, peak memory stays ~maxUnread PRs regardless
 * of how deep we scan. The full open-PR key set is returned separately so callers can prune seen
 * state without wrongly dropping PRs that simply fell outside the cap.
 */
export async function fetchPRsWithActivity(opts: FetchOptions): Promise<FetchResult> {
  const { base, headers, repos } = getConfig();
  const limits = getFetchLimits();
  const maxUnread = opts.maxUnread ?? limits.maxUnread;
  const maxScan = opts.maxScan ?? limits.maxScan;

  // GraphQL transport: one request per page of PRs instead of 5 REST calls per PR (~40x less
  // rate-limit consumption). Behind a preference for now so the REST path stays available as a
  // fallback — GHES in particular may lag on the fields this query needs (§5.7).
  const useGraphQL = getPreferenceValues<Preferences>().useGraphQL;
  log.debug("Transport selected", { transport: useGraphQL ? "graphql" : "rest", source: opts.source ?? "unknown" });
  if (useGraphQL) {
    try {
      const result = await fetchPRsWithActivityGraphQL({
        seen: opts.seen,
        filters: opts.filters,
        prFilter: opts.prFilter,
        maxUnread,
        maxScan,
      });

      // A truncated connection means the query returned fewer items than exist. REST-backfill
      // EVERY truncated candidate, not only PRs already present in the GraphQL unread list: a
      // candidate whose fetched newest page is fully seen may still have an older unread item
      // outside that page. The unread list is finalized only after these complete reads.
      if (result.truncatedPrs.length > 0) {
        log.info("Re-fetching truncated PRs over REST", {
          count: result.truncatedPrs.length,
          prs: result.truncatedPrs.map((pr) => prKey(pr)).slice(0, 5),
          // Which connections overflowed — tells you whether the page sizes in the query need
          // raising, or whether these are genuinely oversized PRs.
          connections: [...new Set(result.truncations.map((t) => t.connection))],
        });

        const backfilled: PRWithActivity[] = [];
        for (const pr of result.truncatedPrs) {
          try {
            backfilled.push(await fetchActivity(base, headers, pr.repo, pr));
          } catch (error) {
            // Partial GraphQL activity is unsafe for seen-state: showing it as complete hides
            // omitted unread items. Abort this transport attempt so the existing outer fallback
            // re-fetches the refresh over REST instead of caching a partial PR.
            log.warn("REST backfill failed for truncated PR — abandoning partial GraphQL result", {
              pr: pr.number,
              error: getErrorMessage(error),
            });
            throw error;
          }
        }

        // Remove partial GraphQL copies before merging the complete REST copies. A backfilled PR
        // is retained only if the full activity list proves it has visible unread activity.
        const truncatedKeys = new Set(result.truncatedPrs.map((pr) => prKey(pr)));
        result.prs = result.prs.filter((pr) => !truncatedKeys.has(prKey(pr)));
        for (const pr of backfilled) {
          const entry = opts.seen[prKey(pr)];
          const allUnseen = getUnseenActivity(pr, entry);
          const visible = allUnseen.some((item) => opts.filters[item.type]);
          if (visible && (!opts.prFilter || matchesPrFilter(pr, opts.prFilter))) {
            result.prs.push(pr);
          }
        }
      }

      // Backfilled candidates can introduce older unread activity that was absent from GraphQL,
      // so restore the global newest-unread ordering and cap only after the complete merge.
      result.prs.sort((a, b) => {
        const aUnseen = getUnseenActivity(a, opts.seen[prKey(a)]).filter((item) => opts.filters[item.type])[0];
        const bUnseen = getUnseenActivity(b, opts.seen[prKey(b)]).filter((item) => opts.filters[item.type])[0];
        return Date.parse(bUnseen?.date ?? b.updated_at) - Date.parse(aUnseen?.date ?? a.updated_at);
      });
      result.prs = result.prs.slice(0, maxUnread);

      // Persist only after every required backfill succeeds, so a failed GraphQL transport attempt
      // cannot commit state derived from a result that is about to be discarded for REST fallback.
      if (result.watermarks.length > 0) {
        await applyFullySeenWatermarks(result.watermarks);
      }

      return {
        prs: result.prs,
        activeKeys: result.activeKeys,
        // A GraphQL scan stops as soon as it has enough unread PRs, so its key set covers only
        // what it walked — never the full open set. Pruning against it would delete read history
        // for unscanned open PRs.
        activeKeysComplete: result.scanComplete,
      };
    } catch (error) {
      // Never let an experimental transport break the command — fall back to REST and say so.
      log.warn("GraphQL fetch failed — falling back to REST for this refresh", {
        error: getErrorMessage(error),
        source: opts.source ?? "unknown",
      });
    }
  }

  // 1) Cheap pass: list open PRs (metadata only) across all repos, most-recently-updated first.
  const listsPerRepo = await Promise.all(
    repos.map(async (repo) => {
      const list = await fetchAllPages<GHPullRequest>(
        `${base}/repos/${repo}/pulls?state=open&sort=updated&direction=desc`,
        headers,
      );
      return list.map((pr) => ({ pr: slimPr(pr), repo }));
    }),
  );
  const openPrs = listsPerRepo.flat();
  const activeKeys = openPrs.map(({ pr, repo }) => prKey({ repo, number: pr.number }));
  // Merge repos into a single most-recently-updated-first order so the scan hits fresh activity first.
  openPrs.sort((a, b) => new Date(b.pr.updated_at).getTime() - new Date(a.pr.updated_at).getTime());
  log.debug("Listed open PRs", {
    source: opts.source ?? "unknown",
    repos: repos.length,
    openPrs: openPrs.length,
    maxUnread,
    maxScan,
  });

  // 2) Expensive pass: pull sub-resources in order, collecting PRs whose unread activity is
  //    currently *visible* (seen + active filters) until we have `maxUnread` of them or hit the
  //    scan cap. Seen/filtered PRs are dropped immediately so peak memory stays ~maxUnread PRs.
  //    Trade-off: filtered-out PRs aren't cached, so re-enabling a filter reveals them only on the
  //    next fetch (interval / revalidate); caching them instead would hold up to `maxScan` PRs in
  //    memory, defeating the bound this pass exists to enforce.
  const collected: PRWithActivity[] = [];
  let scanned = 0;
  const startedAt = Date.now();
  for (let i = 0; i < openPrs.length && collected.length < maxUnread && scanned < maxScan; i += CONCURRENCY) {
    const batch = openPrs.slice(i, i + CONCURRENCY);
    const built = await Promise.all(batch.map(({ pr, repo }) => fetchActivity(base, headers, repo, pr)));
    scanned += built.length;
    for (const pr of built) {
      const unseen = getUnseenActivity(pr, opts.seen[prKey(pr)]).filter((item) => opts.filters[item.type]);
      if (unseen.length > 0 && (!opts.prFilter || matchesPrFilter(pr, opts.prFilter))) {
        collected.push(pr);
        if (collected.length >= maxUnread) break;
      }
    }
  }

  // Each scanned PR costs 5 paginated sub-resource calls (see fetchActivity), so `scanned * 5` is
  // the floor on requests issued by this pass. Logged to quantify the cost the GraphQL rewrite
  // targets — see docs/PERFORMANCE-FINDINGS.md §3.
  log.info("PR activity fetch complete", {
    source: opts.source ?? "unknown",
    scanned,
    collected: collected.length,
    minRequests: scanned * 5 + repos.length,
    elapsedMs: Date.now() - startedAt,
    hitScanCap: scanned >= maxScan,
  });

  // The REST path lists every open PR before scanning, so its key set is always complete.
  return { prs: collected, activeKeys, activeKeysComplete: true };
}
