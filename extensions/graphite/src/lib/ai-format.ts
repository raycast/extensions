import type { InboxSection, PullRequest } from "./api";
import { gitHubPullRequestUrl, graphitePullRequestUrl } from "./api";
import type { PullRequestDetails, PullRequestStatus } from "./github";
import { humanize } from "./presentation";
import { refKey } from "./refs";
import { formatPullRequest } from "./pull-request-input";

/**
 * Compact, plain-data views of the inbox and pull requests for Raycast AI. Small outputs keep the model's context
 * free for the conversation, so long texts are cut and only decision-relevant facts are kept.
 */

const MAX_DESCRIPTION = 3_000;
const MAX_COMMENT = 600;
const MAX_THREADS = 25;

function cut(text: string, max: number): string {
  const clean = text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return clean.length > max ? `${clean.slice(0, max)}… (truncated)` : clean;
}

function checksLabel(checks: string | null): string {
  switch (checks) {
    case "SUCCESS":
      return "passing";
    case "FAILURE":
    case "ERROR":
      return "failing";
    case "PENDING":
    case "EXPECTED":
      return "running";
    default:
      return "none";
  }
}

const reviewLabel = (decision: string | null | undefined) => (decision ? humanize(decision) : "No review required yet");

export type InboxPullRequestForAI = {
  pullRequest: string;
  title: string;
  author: string;
  updatedAt: string;
  graphiteUrl: string;
  githubUrl: string;
  reviewDecision: string;
  mergeStatus?: string;
  draft?: boolean;
  myReview?: string;
  iAmAuthor?: boolean;
  unresolvedComments?: number;
  approvalsWithComments?: number;
  checks?: string;
  hasConflicts?: boolean;
};

export function pullRequestForAI(
  pr: PullRequest,
  appUrl: string,
  status: PullRequestStatus | undefined,
  mergeability: string | undefined,
): InboxPullRequestForAI {
  const ref = { owner: pr.repo.owner, repo: pr.repo.name, number: pr.number };
  return {
    pullRequest: formatPullRequest(ref),
    title: pr.title,
    author: pr.author?.login ?? "unknown",
    updatedAt: pr.updatedAt,
    graphiteUrl: graphitePullRequestUrl(appUrl, ref.owner, ref.repo, ref.number),
    githubUrl: gitHubPullRequestUrl(ref.owner, ref.repo, ref.number),
    reviewDecision: reviewLabel(status?.reviewDecision ?? pr.reviewDecision),
    mergeStatus: mergeability ? humanize(mergeability) : undefined,
    ...(status
      ? {
          draft: status.isDraft || undefined,
          myReview: status.viewerReview ? humanize(status.viewerReview) : undefined,
          iAmAuthor: status.viewerDidAuthor || undefined,
          unresolvedComments: status.threadsTruncated ? undefined : status.unresolvedThreads,
          approvalsWithComments: status.approvalsWithComments.length || undefined,
          checks: checksLabel(status.checks),
          hasConflicts: status.hasConflicts || undefined,
        }
      : {}),
  };
}

export function inboxForAI(
  sections: InboxSection[],
  appUrl: string,
  statuses: Record<string, PullRequestStatus>,
  mergeability: Record<string, string>,
) {
  return sections.map((section) => ({
    section: section.name,
    total: section.totalUnpaginatedPrs,
    countsTowardInbox: section.includeInTotalCount,
    ...(section.totalUnpaginatedPrs > section.prs.length
      ? { note: `Only the ${section.prs.length} most recent are listed. See all in Graphite: ${appUrl}` }
      : {}),
    pullRequests: section.prs.map((pr) => {
      const key = refKey({ owner: pr.repo.owner, repo: pr.repo.name, number: pr.number });
      return pullRequestForAI(pr, appUrl, statuses[key], mergeability[key]);
    }),
  }));
}

export function detailsForAI(
  details: PullRequestDetails,
  ref: { owner: string; repo: string; number: number },
  appUrl: string | undefined,
  mergeability: string | undefined,
) {
  const failing = details.checkRuns.filter((check) => check.state === "FAILURE").map((check) => check.name);
  const running = details.checkRuns.filter((check) => check.state === "PENDING").map((check) => check.name);
  return {
    pullRequest: formatPullRequest(ref),
    title: details.title,
    state: details.isDraft && details.state === "OPEN" ? "DRAFT" : details.state,
    author: details.author?.login ?? "unknown",
    iAmAuthor: details.viewerDidAuthor,
    githubUrl: details.url,
    graphiteUrl: appUrl ? graphitePullRequestUrl(appUrl, ref.owner, ref.repo, ref.number) : undefined,
    branch: `${details.headRefName} → ${details.baseRefName}`,
    size: `+${details.additions} −${details.deletions} in ${details.changedFiles} files`,
    labels: details.labels.map((label) => label.name),
    createdAt: details.createdAt,
    updatedAt: details.updatedAt,
    description: cut(details.body, MAX_DESCRIPTION) || "(no description)",
    reviewDecision: reviewLabel(details.reviewDecision),
    myReview: details.viewerReview ? humanize(details.viewerReview) : undefined,
    mergeStatus: mergeability ? humanize(mergeability) : "Unknown",
    hasConflicts: details.hasConflicts,
    requestedReviewers: details.requestedReviewers,
    reviews: [...details.reviews, ...details.commentReviews].map((review) => ({
      author: review.author?.login ?? "unknown",
      state: humanize(review.state),
      body: cut(review.body, MAX_COMMENT) || undefined,
    })),
    unresolvedComments: details.unresolved.slice(0, MAX_THREADS).map((thread) => ({
      author: thread.author,
      location: `${thread.path}${thread.line ? `:${thread.line}` : ""}`,
      outdated: thread.isOutdated || undefined,
      replies: thread.replies || undefined,
      body: cut(thread.body, MAX_COMMENT),
      url: thread.url,
    })),
    ...(details.unresolved.length > MAX_THREADS || details.threadsTruncated
      ? { unresolvedCommentsNote: "There are more unresolved comments than listed. Open the pull request to see all." }
      : {}),
    checks: {
      summary: checksLabel(details.checks),
      failing,
      running,
      passed: details.checkRuns.filter((check) => check.state === "SUCCESS").length,
    },
    conversationComments: details.conversationComments,
  };
}
