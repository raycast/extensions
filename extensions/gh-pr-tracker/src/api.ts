import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import type {
  GHPullRequest,
  GHReview,
  GHReviewComment,
  GHIssueComment,
  GHIssueEvent,
  GHCommit,
  PRWithActivity,
} from "./types";

interface Preferences {
  ghHost: string;
  token: string;
  repos: string;
  myLogin?: string;
}

function getConfig() {
  const prefs = getPreferenceValues<Preferences>();
  const base = `https://${prefs.ghHost}/api/v3`;
  const headers = {
    Authorization: `token ${prefs.token}`,
    Accept: "application/vnd.github.v3+json",
  };
  const repos = prefs.repos
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return { base, headers, repos, myLogin: prefs.myLogin ?? "" };
}

/** Paginated GET — fetches all pages and concatenates results */
async function fetchAllPages<T>(
  url: string,
  headers: Record<string, string>,
): Promise<T[]> {
  let results: T[] = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const separator = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${separator}per_page=100&page=${page}`, {
      headers,
    });
    if (!res.ok) break;
    const batch = (await res.json()) as T[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    results = results.concat(batch);
    if (batch.length < 100) break;
    page++;
  }
  return results;
}

/** Fetch open PRs with all reviews and comments for a single repo */
async function fetchRepoActivity(
  base: string,
  headers: Record<string, string>,
  repo: string,
): Promise<PRWithActivity[]> {
  const prs = await fetchAllPages<GHPullRequest>(
    `${base}/repos/${repo}/pulls?state=open`,
    headers,
  );

  return Promise.all(
    prs.map(async (pr): Promise<PRWithActivity> => {
      const [reviews, reviewComments, issueComments, events, commits] =
        await Promise.all([
          fetchAllPages<GHReview>(
            `${base}/repos/${repo}/pulls/${pr.number}/reviews`,
            headers,
          ),
          fetchAllPages<GHReviewComment>(
            `${base}/repos/${repo}/pulls/${pr.number}/comments`,
            headers,
          ),
          fetchAllPages<GHIssueComment>(
            `${base}/repos/${repo}/issues/${pr.number}/comments`,
            headers,
          ),
          fetchAllPages<GHIssueEvent>(
            `${base}/repos/${repo}/issues/${pr.number}/events`,
            headers,
          ),
          fetchAllPages<GHCommit>(
            `${base}/repos/${repo}/pulls/${pr.number}/commits`,
            headers,
          ),
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
    }),
  );
}

/** Fetch open PRs with activity across all configured repositories */
export async function fetchPRsWithActivity(): Promise<PRWithActivity[]> {
  const { base, headers, repos } = getConfig();

  const perRepo = await Promise.all(
    repos.map((repo) => fetchRepoActivity(base, headers, repo)),
  );

  return perRepo.flat();
}

export function getMyLogin(): string {
  return getConfig().myLogin;
}
