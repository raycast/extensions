import { getPreferenceValues } from "@raycast/api";
import type {
  GHPullRequest,
  GHReview,
  GHReviewComment,
  GHIssueComment,
  GHIssueEvent,
  GHCommit,
  PRWithActivity,
} from "./types";

function getConfig() {
  const prefs = getPreferenceValues<Preferences>();
  const isGitHubDotCom = prefs.ghHost === "github.com" || prefs.ghHost === "api.github.com";
  const base = isGitHubDotCom ? "https://api.github.com" : `https://${prefs.ghHost}/api/v3`;
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

/** Paginated GET — fetches all pages and concatenates results */
async function fetchAllPages<T>(url: string, headers: Record<string, string>): Promise<T[]> {
  let results: T[] = [];
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
    results = results.concat(batch);
    if (batch.length < 100) break;
    page++;
  }
  return results;
}

/** Process items in batches to avoid hitting GitHub secondary rate limits */
async function processInBatches<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency = 5): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

/** Fetch open PRs with all reviews and comments for a single repo */
async function fetchRepoActivity(
  base: string,
  headers: Record<string, string>,
  repo: string,
): Promise<PRWithActivity[]> {
  const prs = await fetchAllPages<GHPullRequest>(`${base}/repos/${repo}/pulls?state=open`, headers);

  return processInBatches(prs, async (pr): Promise<PRWithActivity> => {
    const [reviews, reviewComments, issueComments, events, commits] = await Promise.all([
      fetchAllPages<GHReview>(`${base}/repos/${repo}/pulls/${pr.number}/reviews`, headers),
      fetchAllPages<GHReviewComment>(`${base}/repos/${repo}/pulls/${pr.number}/comments`, headers),
      fetchAllPages<GHIssueComment>(`${base}/repos/${repo}/issues/${pr.number}/comments`, headers),
      fetchAllPages<GHIssueEvent>(`${base}/repos/${repo}/issues/${pr.number}/events`, headers),
      fetchAllPages<GHCommit>(`${base}/repos/${repo}/pulls/${pr.number}/commits`, headers),
    ]);
    return {
      ...pr,
      repo,
      reviews,
      reviewComments,
      issueComments,
      events,
      commits,
    };
  });
}

/** Fetch open PRs with activity across all configured repositories */
export async function fetchPRsWithActivity(): Promise<PRWithActivity[]> {
  const { base, headers, repos } = getConfig();

  const perRepo = await Promise.all(repos.map((repo) => fetchRepoActivity(base, headers, repo)));

  return perRepo.flat();
}
