import { getApiUrl, getAuthenticatedUser } from "./auth";
import { searchPullRequests } from "./search";
import { PullRequest } from "./types/pr";
import { MyReviewActivity, ReviewRequestsCategorized, Review, ReviewComment } from "./types/reviews";
import { getRepoName } from "./utils";

async function fetchMyReviewActivity(
  apiUrl: string,
  token: string,
  login: string,
  repoFullName: string,
  prNumber: number,
): Promise<MyReviewActivity> {
  const headers = { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" };

  const [commentsRes, reviewsRes] = await Promise.all([
    fetch(`${apiUrl}/repos/${repoFullName}/pulls/${prNumber}/comments?per_page=100`, { headers }),
    fetch(`${apiUrl}/repos/${repoFullName}/pulls/${prNumber}/reviews?per_page=100`, { headers }),
  ]);

  const comments: ReviewComment[] = commentsRes.ok ? ((await commentsRes.json()) as ReviewComment[]) : [];
  const reviews: Review[] = reviewsRes.ok ? ((await reviewsRes.json()) as Review[]) : [];

  const myCommentIds = new Set(comments.filter((c) => c.user.login === login).map((c) => c.id));
  const hasCommented = myCommentIds.size > 0;
  const hasReplies = comments.some(
    (c) => c.user.login !== login && c.in_reply_to_id != null && myCommentIds.has(c.in_reply_to_id),
  );

  const myLatestReview = reviews
    .filter((r) => r.user.login === login && (r.state === "APPROVED" || r.state === "CHANGES_REQUESTED"))
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0];
  const hasRequestedChanges = myLatestReview?.state === "CHANGES_REQUESTED";

  return { hasCommented, hasRequestedChanges, hasReplies };
}

export async function fetchReviewRequestsCategorized(
  baseUrl: string,
  token: string,
): Promise<ReviewRequestsCategorized> {
  const apiUrl = getApiUrl(baseUrl);
  const login = await getAuthenticatedUser(baseUrl, token);
  const prs = await searchPullRequests(apiUrl, token, `is:pr is:open review-requested:${login}`);

  const results = await Promise.all(
    prs.map(async (pr: PullRequest) => {
      const activity = await fetchMyReviewActivity(apiUrl, token, login, getRepoName(pr), pr.number);
      return { pr, activity };
    }),
  );

  const inReview = results.filter((r) => r.activity.hasCommented || r.activity.hasRequestedChanges);
  const pending = results.filter((r) => !r.activity.hasCommented && !r.activity.hasRequestedChanges).map((r) => r.pr);

  return { inReview, pending };
}
