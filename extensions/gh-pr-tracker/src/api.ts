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

const CONCURRENCY = 5;

function getConfig() {
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
      throw new Error(`GitHub API error: ${res.status} ${res.statusText} for ${url}`);
    }
    const batch = (await res.json()) as T[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const item of batch) results.push(item);
    if (batch.length < 100) break;
    page++;
  }
  return results;
}

/** Fetch all reviews / comments / events / commits for a single PR. */
async function fetchActivity(
  base: string,
  headers: Record<string, string>,
  repo: string,
  pr: GHPullRequest,
): Promise<PRWithActivity> {
  const [reviews, reviewComments, issueComments, events, commits] = await Promise.all([
    fetchAllPages<GHReview>(`${base}/repos/${repo}/pulls/${pr.number}/reviews`, headers),
    fetchAllPages<GHReviewComment>(`${base}/repos/${repo}/pulls/${pr.number}/comments`, headers),
    fetchAllPages<GHIssueComment>(`${base}/repos/${repo}/issues/${pr.number}/comments`, headers),
    fetchAllPages<GHIssueEvent>(`${base}/repos/${repo}/issues/${pr.number}/events`, headers),
    fetchAllPages<GHCommit>(`${base}/repos/${repo}/pulls/${pr.number}/commits`, headers),
  ]);
  return { ...pr, repo, reviews, reviewComments, issueComments, events, commits };
}

/**
 * Keep only the PR fields we actually consume. The open-PR list for a large repo can be hundreds
 * of entries; dropping the heavy fields GitHub returns (body, labels, …) keeps the in-memory
 * index of open PRs small while we scan for unread activity.
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
  };
}

export interface FetchOptions {
  /** Current seen state — used to skip PRs with no unread activity while backfilling. */
  seen: SeenMap;
  /** Active event filters — a PR whose only activity is filtered out doesn't count as unread. */
  filters: EventFilters;
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

  // 2) Expensive pass: pull sub-resources in order, collecting PRs whose unread activity is
  //    currently *visible* (seen + active filters) until we have `maxUnread` of them or hit the
  //    scan cap. Seen/filtered PRs are dropped immediately so peak memory stays ~maxUnread PRs.
  //    Trade-off: filtered-out PRs aren't cached, so re-enabling a filter reveals them only on the
  //    next fetch (interval / revalidate); caching them instead would hold up to `maxScan` PRs in
  //    memory, defeating the bound this pass exists to enforce.
  const collected: PRWithActivity[] = [];
  let scanned = 0;
  for (let i = 0; i < openPrs.length && collected.length < maxUnread && scanned < maxScan; i += CONCURRENCY) {
    const batch = openPrs.slice(i, i + CONCURRENCY);
    const built = await Promise.all(batch.map(({ pr, repo }) => fetchActivity(base, headers, repo, pr)));
    scanned += built.length;
    for (const pr of built) {
      const unseen = getUnseenActivity(pr, opts.seen[prKey(pr)]).filter((item) => opts.filters[item.type]);
      if (unseen.length > 0) {
        collected.push(pr);
        if (collected.length >= maxUnread) break;
      }
    }
  }

  return { prs: collected, activeKeys };
}
