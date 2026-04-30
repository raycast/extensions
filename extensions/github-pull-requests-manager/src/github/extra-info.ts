import { getApiUrl } from "./auth";
import { PRDetails } from "./types/pr";
import { ReviewCounts, Review } from "./types/reviews";
import { PRExtraInfo, CIInfo, CIStatus, CheckRun, CheckRunsResponse } from "./types/ci";

export async function fetchReviewCounts(
  apiUrl: string,
  token: string,
  repoFullName: string,
  prNumber: number,
): Promise<ReviewCounts> {
  const response = await fetch(`${apiUrl}/repos/${repoFullName}/pulls/${prNumber}/reviews?per_page=100`, {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!response.ok) return { approved: 0, changesRequested: 0 };

  const reviews = (await response.json()) as Review[];

  const latestByReviewer = new Map<string, { state: string; submittedAt: string }>();
  for (const review of reviews) {
    if (review.state === "APPROVED" || review.state === "CHANGES_REQUESTED") {
      const existing = latestByReviewer.get(review.user.login);
      if (!existing || review.submitted_at > existing.submittedAt) {
        latestByReviewer.set(review.user.login, { state: review.state, submittedAt: review.submitted_at });
      }
    }
  }

  let approved = 0,
    changesRequested = 0;
  for (const { state } of latestByReviewer.values()) {
    if (state === "APPROVED") approved++;
    else if (state === "CHANGES_REQUESTED") changesRequested++;
  }
  return { approved, changesRequested };
}

async function fetchPRDetails(
  apiUrl: string,
  token: string,
  repoFullName: string,
  prNumber: number,
): Promise<PRDetails | null> {
  const response = await fetch(`${apiUrl}/repos/${repoFullName}/pulls/${prNumber}`, {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!response.ok) return null;
  return (await response.json()) as PRDetails;
}

async function fetchCI(apiUrl: string, token: string, repoFullName: string, sha: string): Promise<CIInfo> {
  const response = await fetch(`${apiUrl}/repos/${repoFullName}/commits/${sha}/check-runs?per_page=100`, {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!response.ok) return { status: "unknown", passing: 0, failing: 0, pending: 0, failingNames: [], total: 0 };

  const data = (await response.json()) as CheckRunsResponse;
  if (data.total_count === 0)
    return { status: "unknown", passing: 0, failing: 0, pending: 0, failingNames: [], total: 0 };

  let passing = 0,
    failing = 0,
    pending = 0;
  const failingNames: string[] = [];

  for (const run of data.check_runs as CheckRun[]) {
    if (run.status !== "completed") {
      pending++;
    } else if (["success", "neutral", "skipped"].includes(run.conclusion ?? "")) {
      passing++;
    } else {
      failing++;
      failingNames.push(run.name);
    }
  }

  const total = data.check_runs.length;
  const status: CIStatus = failing > 0 ? "failure" : pending > 0 ? "pending" : "success";
  return { status, passing, failing, pending, failingNames, total };
}

export async function fetchPRExtraInfo(
  baseUrl: string,
  token: string,
  repoFullName: string,
  prNumber: number,
): Promise<PRExtraInfo> {
  const apiUrl = getApiUrl(baseUrl);
  const [reviewCounts, prDetails] = await Promise.all([
    fetchReviewCounts(apiUrl, token, repoFullName, prNumber),
    fetchPRDetails(apiUrl, token, repoFullName, prNumber),
  ]);

  const ci = prDetails
    ? await fetchCI(apiUrl, token, repoFullName, prDetails.head.sha)
    : { status: "unknown" as CIStatus, passing: 0, failing: 0, pending: 0, failingNames: [], total: 0 };

  return { reviewCounts, mergeableState: prDetails?.mergeable_state ?? null, ci };
}
